import { Test } from '@nestjs/testing';
import { PrismaService } from 'src/prisma/prisma.service';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
  const findMany = jest.fn();
  let service: ServicesService;

  beforeEach(async () => {
    findMany.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: PrismaService,
          useValue: { service: { findMany } },
        },
      ],
    }).compile();

    service = moduleRef.get(ServicesService);
  });

  it('returns parent categories with only selectable subservices', async () => {
    const categories = [
      {
        id: 'category-1',
        name: 'Monuments',
        description: 'Monument services',
        children: [
          {
            id: 'service-1',
            name: 'Granite monument',
            description: 'A granite monument',
            price: 100,
          },
        ],
      },
    ];
    findMany.mockResolvedValue(categories);

    await expect(service.getAll()).resolves.toEqual(categories);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        parentId: null,
        children: {
          some: {
            parentId: { not: null },
            price: { not: null },
            children: { none: {} },
          },
        },
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
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
    });
  });
});
