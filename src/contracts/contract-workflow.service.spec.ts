import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ContractWorkflowService } from './contract-workflow.service';

describe('ContractWorkflowService', () => {
  const findProfile = jest.fn();
  const updateMany = jest.fn();
  const findFirst = jest.fn();
  const findUniqueOrThrow = jest.fn();
  const eventEmitter = { emit: jest.fn() };
  let service: ContractWorkflowService;

  beforeEach(async () => {
    findProfile.mockReset();
    updateMany.mockReset();
    findFirst.mockReset();
    findUniqueOrThrow.mockReset();
    eventEmitter.emit.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ContractWorkflowService,
        {
          provide: PrismaService,
          useValue: {
            employeeProfile: { findUnique: findProfile },
            contract: { updateMany, findFirst, findUniqueOrThrow },
          },
        },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = moduleRef.get(ContractWorkflowService);
  });

  it('moves an employee contract to awaiting confirmation and emits an event', async () => {
    const contract = {
      id: 'contract-1',
      status: 'awaiting_confirmation',
      employeeId: 'employee-profile-1',
    };
    findProfile.mockResolvedValue({ id: 'employee-profile-1' });
    updateMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue(contract);

    await expect(service.complete('contract-1', 'employee-1')).resolves.toEqual(
      contract,
    );
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'contract-1',
          status: 'in_progress',
          employeeId: 'employee-profile-1',
        },
        data: { status: 'awaiting_confirmation' },
      }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('contract.statusChanged', {
      contractId: 'contract-1',
      from: 'in_progress',
      to: 'awaiting_confirmation',
      actorId: 'employee-1',
    });
  });

  it('reports a conflict when the contract is in the wrong status', async () => {
    findProfile.mockResolvedValue({ id: 'employee-profile-1' });
    updateMany.mockResolvedValue({ count: 0 });
    findFirst.mockResolvedValue({ id: 'contract-1' });

    await expect(service.complete('contract-1', 'employee-1')).rejects.toThrow(
      ConflictException,
    );
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
