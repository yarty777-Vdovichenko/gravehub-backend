import { createHash } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { AccountTokensService } from './account-tokens.service';

describe('AccountTokensService', () => {
  const findMany = jest.fn();
  const create = jest.fn();
  const updateMany = jest.fn();
  const findUnique = jest.fn();
  let service: AccountTokensService;

  beforeEach(async () => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
    create.mockReset();
    updateMany.mockReset();
    findUnique.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountTokensService,
        {
          provide: PrismaService,
          useValue: {
            userToken: { findMany, create, updateMany, findUnique },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AccountTokensService);
  });

  it('replaces active tokens and persists only a hash with an expiry', async () => {
    const startedAt = Date.now();
    const token = await service.create('user-1', 'email_verification', 60);
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const createArgs = create.mock.calls[0][0];
    const expiry = createArgs.data.expiresAt as Date;

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        type: 'email_verification',
        usedAt: null,
      },
      data: { usedAt: expect.any(Date) },
    });
    expect(createArgs.data).toEqual(
      expect.objectContaining({
        userId: 'user-1',
        type: 'email_verification',
        tokenHash,
      }),
    );
    expect(expiry.getTime()).toBeGreaterThanOrEqual(startedAt + 60 * 60 * 1000);
    expect(expiry.getTime()).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000);
  });

  it('blocks a new email during the cooldown', async () => {
    findMany.mockResolvedValue([{ createdAt: new Date(Date.now() - 10_000) }]);

    await expect(
      service.create('user-1', 'password_reset', 60),
    ).rejects.toMatchObject({ status: 429 });
    expect(create).not.toHaveBeenCalled();
  });

  it('blocks a new email after the hourly cap is reached', async () => {
    findMany.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        createdAt: new Date(Date.now() - (120 + i * 60) * 1000),
      })),
    );

    await expect(
      service.create('user-1', 'password_reset', 60),
    ).rejects.toMatchObject({ status: 429 });
    expect(create).not.toHaveBeenCalled();
  });

  it('allows a new email once the cooldown has passed', async () => {
    findMany.mockResolvedValue([{ createdAt: new Date(Date.now() - 90_000) }]);

    await expect(
      service.create('user-1', 'password_reset', 60),
    ).resolves.toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects expired or already-consumed tokens', async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.consume('invalid-token', 'password_reset'),
    ).rejects.toThrow(BadRequestException);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('returns the user id after atomically consuming a valid token', async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({ userId: 'user-1' });

    await expect(
      service.consume('valid-token', 'password_reset'),
    ).resolves.toBe('user-1');
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tokenHash: createHash('sha256').update('valid-token').digest('hex'),
          type: 'password_reset',
          usedAt: null,
          expiresAt: expect.objectContaining({ gt: expect.any(Date) }),
        }),
        data: { usedAt: expect.any(Date) },
      }),
    );
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256').update('valid-token').digest('hex'),
      },
    });
  });
});
