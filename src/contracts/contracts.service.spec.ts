import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ContractsService } from './contracts.service';

describe('ContractsService price estimate', () => {
  const findServices = jest.fn();
  let service: ContractsService;

  beforeEach(async () => {
    findServices.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: PrismaService,
          useValue: { service: { findMany: findServices } },
        },
      ],
    }).compile();

    service = moduleRef.get(ContractsService);
  });

  it('returns selected service prices and their rounded total', async () => {
    const selectedServices = [
      { id: 'service-1', name: 'Service one', price: 10.1 },
      { id: 'service-2', name: 'Service two', price: 20.2 },
    ];
    findServices.mockResolvedValue(selectedServices);

    await expect(
      service.estimatePrice(['service-1', 'service-2']),
    ).resolves.toEqual({
      services: selectedServices,
      estimatedPrice: 30.3,
    });
  });

  it('rejects the estimate when any selected service does not exist', async () => {
    findServices.mockResolvedValue([
      { id: 'service-1', name: 'Service one', price: 10 },
    ]);

    await expect(
      service.estimatePrice(['service-1', 'missing-service']),
    ).rejects.toThrow(BadRequestException);
  });
});
