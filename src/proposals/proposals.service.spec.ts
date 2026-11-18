import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProposalsService } from './proposals.service';

describe('ProposalsService accept', () => {
  const findProposal = jest.fn();
  const eventEmitter = { emit: jest.fn() };
  let runTransaction: jest.Mock;
  let service: ProposalsService;

  beforeEach(async () => {
    findProposal.mockReset();
    eventEmitter.emit.mockReset();

    const tx = {
      contract: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'contract-1',
          status: 'in_progress',
          employeeId: 'employee-1',
        }),
      },
      proposal: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        updateManyAndReturn: jest
          .fn()
          .mockResolvedValue([{ id: 'proposal-2' }]),
      },
    };
    runTransaction = jest.fn(
      (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProposalsService,
        {
          provide: PrismaService,
          useValue: {
            proposal: { findFirst: findProposal },
            $transaction: runTransaction,
          },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(ProposalsService);
  });

  it('assigns the employee, accepts one proposal, rejects the others, and emits events', async () => {
    findProposal.mockResolvedValue({
      id: 'proposal-1',
      employeeId: 'employee-1',
    });

    await expect(
      service.accept('contract-1', 'proposal-1', 'customer-1'),
    ).resolves.toEqual({
      id: 'contract-1',
      status: 'in_progress',
      employeeId: 'employee-1',
    });

    expect(runTransaction).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith('proposal.accepted', {
      proposalId: 'proposal-1',
      contractId: 'contract-1',
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith('proposal.rejected', {
      proposalId: 'proposal-2',
      contractId: 'contract-1',
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith('contract.statusChanged', {
      contractId: 'contract-1',
      from: 'open',
      to: 'in_progress',
      actorId: 'customer-1',
    });
  });

  it('does not start a transaction when the proposal is not owned by the customer', async () => {
    findProposal.mockResolvedValue(null);

    await expect(
      service.accept('contract-1', 'proposal-1', 'customer-1'),
    ).rejects.toThrow(NotFoundException);
    expect(runTransaction).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
