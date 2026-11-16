import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateContractDto } from './dto/CreateContract.dto';
import { Prisma } from '@prisma/client';
import { ContractsQueryDto } from './dto/contracts-query.dto';
import { buildContractWhere } from './contracts-query.util';

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

    return this.prisma.contract.create({
      data: {
        title: dto.title,
        description: dto.description,
        regionId: dto.regionId,
        positionX: dto.positionX,
        positionY: dto.positionY,
        date: dto.date,
        budget: dto.budget,
        customerId: userId,
        serviceTypes: {
          connect: dto.serviceTypeIds.map((id) => ({ id })),
        },
      },
      include: { serviceTypes: true },
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
      where: { id: { in: serviceTypeIds } },
      select: { id: true, name: true, price: true },
    });

    if (services.length !== serviceTypeIds.length) {
      throw new BadRequestException('One or more serviceTypeIds are invalid');
    }

    return services;
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
        include: { serviceTypes: true },
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
        serviceTypes: true,
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
