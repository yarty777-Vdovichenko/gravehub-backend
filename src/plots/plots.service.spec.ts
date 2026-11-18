import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';

jest.mock('src/auth/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: class JwtAuthGuard {},
}));

import { PlotsService } from './plots.service';

describe('PlotsService', () => {
  const findMany = jest.fn();
  const findUnique = jest.fn();
  const updateMany = jest.fn();
  let service: PlotsService;

  beforeEach(async () => {
    findMany.mockReset();
    findUnique.mockReset();
    updateMany.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlotsService,
        {
          provide: PrismaService,
          useValue: {
            burialPlot: { findMany, findUnique, updateMany },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(PlotsService);
  });

  it('reports expired reservations as available', async () => {
    findMany.mockResolvedValue([
      {
        id: 'expired-plot',
        status: 'reserved',
        reservedUntil: new Date(Date.now() - 60_000),
      },
      {
        id: 'active-plot',
        status: 'reserved',
        reservedUntil: new Date(Date.now() + 60_000),
      },
    ]);

    await expect(service.findPlots('cemetery-1')).resolves.toEqual([
      { id: 'expired-plot', status: 'available' },
      { id: 'active-plot', status: 'reserved' },
    ]);
  });

  it('rejects a reservation when the plot is already unavailable', async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValue({ id: 'plot-1' });

    await expect(service.reserve('plot-1', 'user-1')).rejects.toThrow(
      ConflictException,
    );
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'plot-1' }),
      }),
    );
  });
});
