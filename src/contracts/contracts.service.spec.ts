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

  it('returns a price range for each parent service and totals the ranges', async () => {
    const selectedCategories = [
      {
        id: 'category-1',
        name: 'Category one',
        children: [
          { id: 'service-1', name: 'Service one', price: 10.1 },
          { id: 'service-2', name: 'Service two', price: 20.2 },
        ],
      },
      {
        id: 'category-2',
        name: 'Category two',
        children: [
          { id: 'service-3', name: 'Service three', price: 5.25 },
          { id: 'service-4', name: 'Service four', price: 7 },
        ],
      },
    ];
    findServices.mockResolvedValue(selectedCategories);

    await expect(
      service.estimatePrice(['category-1', 'category-2']),
    ).resolves.toEqual({
      services: [
        {
          id: 'category-1',
          name: 'Category one',
          minPrice: 10.1,
          maxPrice: 20.2,
        },
        {
          id: 'category-2',
          name: 'Category two',
          minPrice: 5.25,
          maxPrice: 7,
        },
      ],
      minEstimatedPrice: 15.35,
      maxEstimatedPrice: 27.2,
    });
  });

  it('rejects the estimate when any selected service does not exist', async () => {
    findServices.mockResolvedValue([
      {
        id: 'category-1',
        name: 'Category one',
        children: [{ id: 'service-1', name: 'Service one', price: 10 }],
      },
    ]);

    await expect(
      service.estimatePrice(['category-1', 'missing-category']),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a child service id when estimating contract categories', async () => {
    findServices.mockResolvedValue([]);

    await expect(service.estimatePrice(['service-1'])).rejects.toThrow(
      BadRequestException,
    );
    expect(findServices).toHaveBeenCalledWith({
      where: {
        id: { in: ['service-1'] },
        parentId: null,
        children: {
          some: {
            parentId: { not: null },
            price: { not: null },
            children: { none: {} },
          },
        },
      },
      select: {
        id: true,
        name: true,
        children: {
          where: {
            parentId: { not: null },
            price: { not: null },
            children: { none: {} },
          },
          select: { id: true, name: true, price: true },
        },
      },
    });
  });

  it('allows the customer to create a contract for their purchased plot', async () => {
    findServices.mockResolvedValue([
      {
        id: 'category-1',
        name: 'Category',
        children: [{ id: 'service-1', name: 'Service', price: 10 }],
      },
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
      serviceTypeIds: ['category-1'],
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
        serviceTypes: { connect: [{ id: 'category-1' }] },
      },
      include: {
        serviceTypes: {
          include: {
            children: {
              where: {
                parentId: { not: null },
                price: { not: null },
                children: { none: {} },
              },
              orderBy: { name: 'asc' },
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
              },
            },
          },
        },
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
      {
        id: 'category-1',
        name: 'Category',
        children: [{ id: 'service-1', name: 'Service', price: 10 }],
      },
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
        serviceTypeIds: ['category-1'],
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
