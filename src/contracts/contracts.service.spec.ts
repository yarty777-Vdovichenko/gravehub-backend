import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ContractsService } from './contracts.service';

describe('ContractsService price estimate', () => {
  const findServices = jest.fn();
  const findRegion = jest.fn();
  const findPlot = jest.fn();
  const createContract = jest.fn();
  let service: ContractsService;

  beforeEach(async () => {
    findServices.mockReset();
    findRegion.mockReset();
    findPlot.mockReset();
    createContract.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContractsService,
        {
          provide: PrismaService,
          useValue: {
            service: { findMany: findServices },
            region: { findUnique: findRegion },
            burialPlot: { findUnique: findPlot },
            contract: { create: createContract },
          },
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

  it('allows the customer to create a contract for their purchased plot', async () => {
    findServices.mockResolvedValue([
      { id: 'service-1', name: 'Service', price: 10 },
    ]);
    findRegion.mockResolvedValue({ id: 'region-1' });
    findPlot.mockResolvedValue({
      id: 'plot-1',
      status: 'sold',
      ownerId: 'customer-1',
      purchase: { userId: 'customer-1' },
      cemetery: {
        latitude: 50,
        longitude: 30,
        name: 'Cemetery',
        city: 'Kyiv',
      },
    });
    createContract.mockResolvedValue({ id: 'contract-1' });

    await service.create('customer-1', {
      title: 'Plot care',
      description: 'Care for the purchased plot',
      serviceTypeIds: ['service-1'],
      regionId: 'region-1',
      locationType: 'burial_plot',
      burialPlotId: 'plot-1',
      date: new Date('2030-01-01T10:00:00.000Z'),
      budget: 100,
    });

    expect(createContract).toHaveBeenCalledWith({
      data: {
        title: 'Plot care',
        description: 'Care for the purchased plot',
        regionId: 'region-1',
        locationType: 'burial_plot',
        positionX: 50,
        positionY: 30,
        address: 'Kyiv, Cemetery',
        burialPlotId: 'plot-1',
        date: new Date('2030-01-01T10:00:00.000Z'),
        budget: 100,
        customerId: 'customer-1',
        serviceTypes: { connect: [{ id: 'service-1' }] },
      },
      include: {
        serviceTypes: true,
        burialPlot: {
          select: {
            id: true,
            positionX: true,
            positionY: true,
            cemetery: { select: { id: true, name: true, city: true } },
          },
        },
      },
    });
  });

  it('rejects a sold plot purchased by another customer', async () => {
    findServices.mockResolvedValue([
      { id: 'service-1', name: 'Service', price: 10 },
    ]);
    findRegion.mockResolvedValue({ id: 'region-1' });
    findPlot.mockResolvedValue({
      id: 'plot-1',
      status: 'sold',
      ownerId: 'another-customer',
      purchase: { userId: 'another-customer' },
      cemetery: {
        latitude: 50,
        longitude: 30,
        name: 'Cemetery',
        city: 'Kyiv',
      },
    });

    await expect(
      service.create('customer-1', {
        title: 'Plot care',
        description: 'Care for a plot',
        serviceTypeIds: ['service-1'],
        regionId: 'region-1',
        locationType: 'burial_plot',
        burialPlotId: 'plot-1',
        date: new Date('2030-01-01T10:00:00.000Z'),
        budget: 100,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(createContract).not.toHaveBeenCalled();
  });
});
