import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProposalsService } from './proposals.service';

describe('ProposalsService accept', () => {
  const findProposal = jest.fn();
  const findEmployee = jest.fn();
  const findContract = jest.fn();
  const createProposal = jest.fn();
  const findProposals = jest.fn();
  const countProposals = jest.fn();
  const eventEmitter = { emit: jest.fn() };
  let runTransaction: jest.Mock;
  let service: ProposalsService;

  beforeEach(async () => {
    findProposal.mockReset();
    findEmployee.mockReset();
    findContract.mockReset();
    createProposal.mockReset();
    findProposals.mockReset();
    countProposals.mockReset();
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
            employeeProfile: { findUnique: findEmployee },
            contract: { findFirst: findContract },
            proposal: {
              findFirst: findProposal,
              create: createProposal,
              findMany: findProposals,
              count: countProposals,
            },
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
      contract: { serviceTypes: [{ id: 'category-1' }] },
      employee: { specialization: [{ parentId: 'category-1' }] },
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

  it('does not accept a proposal when the employee no longer covers its categories', async () => {
    findProposal.mockResolvedValue({
      id: 'proposal-1',
      employeeId: 'employee-1',
      contract: { serviceTypes: [{ id: 'category-1' }] },
      employee: { specialization: [] },
    });

    await expect(
      service.accept('contract-1', 'proposal-1', 'customer-1'),
    ).rejects.toThrow(
      'Employee does not offer all selected service categories',
    );
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('allows a proposal only when the employee covers all contract categories', async () => {
    findEmployee.mockResolvedValue({
      id: 'employee-profile-1',
      specialization: [{ parentId: 'category-1' }, { parentId: 'category-2' }],
    });
    findContract.mockResolvedValue({ id: 'contract-1' });
    createProposal.mockResolvedValue({
      id: 'proposal-1',
      contractId: 'contract-1',
    });

    await expect(
      service.propose('contract-1', 'employee-1', {
        price: 100,
        comment: 'I can do this work',
      }),
    ).resolves.toEqual({
      id: 'proposal-1',
      contractId: 'contract-1',
    });
    expect(findContract).toHaveBeenCalledWith({
      where: {
        id: 'contract-1',
        status: 'open',
        customerId: { not: 'employee-1' },
        region: { employees: { some: { userId: 'employee-1' } } },
        serviceTypes: {
          every: { id: { in: ['category-1', 'category-2'] } },
        },
      },
      select: { id: true },
    });
    expect(createProposal).toHaveBeenCalledWith({
      data: {
        contractId: 'contract-1',
        employeeId: 'employee-profile-1',
        price: 100,
        comment: 'I can do this work',
      },
    });
  });

  it('returns the proposal employee subservices under the contract categories', async () => {
    findContract.mockResolvedValue({
      id: 'contract-1',
      serviceTypes: [{ id: 'category-1' }],
    });
    findProposals.mockResolvedValue([]);
    countProposals.mockResolvedValue(0);
    runTransaction.mockResolvedValue([[], 0]);

    await service.listForContract('contract-1', 'customer-1', {
      page: 1,
      limit: 20,
    });

    expect(findProposals).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          employee: {
            select: expect.objectContaining({
              specialization: {
                where: {
                  parentId: { in: ['category-1'] },
                  price: { not: null },
                  children: { none: {} },
                },
                orderBy: { name: 'asc' },
                select: {
                  id: true,
                  name: true,
                  price: true,
                  parent: { select: { id: true, name: true } },
                },
              },
            }),
          },
        }),
      }),
    );
  });

  it('does not create a proposal if the employee cannot cover every category', async () => {
    findEmployee.mockResolvedValue({
      id: 'employee-profile-1',
      specialization: [{ parentId: 'category-1' }],
    });
    findContract.mockResolvedValue(null);

    await expect(
      service.propose('contract-1', 'employee-1', {
        price: 100,
        comment: 'I can do this work',
      }),
    ).rejects.toThrow();
    expect(createProposal).not.toHaveBeenCalled();
    expect(findContract).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serviceTypes: { every: { id: { in: ['category-1'] } } },
        }),
      }),
    );
  });
});
