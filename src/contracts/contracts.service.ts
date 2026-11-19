import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContractDto } from './dto/CreateContract.dto';
import { Prisma } from '@prisma/client';
import { ContractLocationType } from '@prisma/client';
import { ContractsQueryDto } from './dto/contracts-query.dto';
import { buildContractWhere } from './contracts-query.util';
import { selectableServiceWhere } from 'src/services/services-query.util';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateContractDto) {
    const [, region] = await Promise.all([
      this.getServices(dto.serviceTypeIds),
      this.prisma.region.findUnique({
        where: { id: dto.regionId },
        select: { id: true },
      }),
    ]);

    if (!region) throw new BadRequestException('regionId is invalid');

    const locationType = dto.locationType ?? ContractLocationType.coordinates;
    let positionX: number | null = null;
    let positionY: number | null = null;
    let address: string | null = null;
    let burialPlotId: string | null = null;

    if (locationType === ContractLocationType.coordinates) {
      if (dto.positionX === undefined || dto.positionY === undefined) {
        throw new BadRequestException(
          'positionX and positionY are required for coordinate location',
        );
      }
      positionX = dto.positionX;
      positionY = dto.positionY;
    } else if (locationType === ContractLocationType.burial_plot) {
      if (!dto.burialPlotId) {
        throw new BadRequestException(
          'burialPlotId is required for burial plot location',
        );
      }
      const plot = await this.prisma.burialPlot.findUnique({
        where: { id: dto.burialPlotId },
        include: {
          cemetery: {
            select: {
              latitude: true,
              longitude: true,
              name: true,
              city: true,
            },
          },
          purchase: { select: { userId: true } },
        },
      });
      if (!plot) throw new BadRequestException('burialPlotId is invalid');
      const isOwnedPlot =
        plot.status === 'sold' &&
        plot.ownerId === userId &&
        plot.purchase?.userId === userId;
      if (plot.status !== 'available' && !isOwnedPlot) {
        throw new BadRequestException(
          'Selected burial plot is reserved or sold',
        );
      }

      burialPlotId = plot.id;
      positionX = plot.cemetery.latitude;
      positionY = plot.cemetery.longitude;
      address = `${plot.cemetery.city}, ${plot.cemetery.name}`;
    } else if (locationType === ContractLocationType.address) {
      if (!dto.address?.trim()) {
        throw new BadRequestException(
          'address is required for address location',
        );
      }
      address = dto.address.trim();
    }

    return this.prisma.contract.create({
      data: {
        title: dto.title,
        description: dto.description,
        regionId: dto.regionId,
        locationType,
        positionX,
        positionY,
        address,
        burialPlotId,
        date: dto.date,
        budget: dto.budget,
        customerId: userId,
        serviceTypes: {
          connect: dto.serviceTypeIds.map((id) => ({ id })),
        },
      },
      include: {
        serviceTypes: {
          include: { parent: { select: { id: true, name: true } } },
        },
        burialPlot: {
          select: {
            id: true,
            positionX: true,
            positionY: true,
            cemetery: {
              select: { id: true, name: true, city: true },
            },
          },
        },
      },
    });
  }

  async estimatePrice(serviceTypeIds: string[]) {
    const services = await this.getServices(serviceTypeIds);
    const total = services.reduce((sum, service) => sum + service.price, 0);
    const estimatedPrice = Math.round((total + Number.EPSILON) * 100) / 100;

    return {
      services: services.map(({ id, name, price }) => ({ id, name, price })),
      estimatedPrice,
    };
  }

  private async getServices(serviceTypeIds: string[]) {
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceTypeIds },
        ...selectableServiceWhere,
      },
      select: { id: true, name: true, price: true },
    });

    const pricedServices = services.filter(
      (service): service is typeof service & { price: number } =>
        service.price !== null,
    );

    if (pricedServices.length !== serviceTypeIds.length) {
      throw new BadRequestException('One or more serviceTypeIds are invalid');
    }

    return pricedServices;
  }

  async getMine(userId: string, query: ContractsQueryDto) {
    const where: Prisma.ContractWhereInput = {
      AND: [{ customerId: userId }, buildContractWhere(query)],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        orderBy: { [query.sortBy]: query.order },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          serviceTypes: {
            include: { parent: { select: { id: true, name: true } } },
          },
          burialPlot: {
            select: {
              id: true,
              positionX: true,
              positionY: true,
              cemetery: {
                select: { id: true, name: true, city: true },
              },
            },
          },
        },
      }),
      this.prisma.contract.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        pages: Math.ceil(total / query.limit),
      },
    };
  }
  async getById(id: string, userId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, customerId: userId },
      include: {
        serviceTypes: {
          include: { parent: { select: { id: true, name: true } } },
        },
        burialPlot: {
          select: {
            id: true,
            positionX: true,
            positionY: true,
            cemetery: {
              select: { id: true, name: true, city: true },
            },
          },
        },
        review: {
          select: { id: true, rating: true, text: true, createdAt: true },
        },
      },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }
  async delete(id: string, userId: string) {
    try {
      await this.prisma.contract.delete({
        where: { id, customerId: userId, status: 'open', employeeId: null },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Contract not found or cannot be deleted');
      }
      throw e;
    }
  }
}
