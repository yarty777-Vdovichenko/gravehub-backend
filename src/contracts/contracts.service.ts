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
    const [service, region] = await Promise.all([
      this.prisma.service.findUnique({
        where: { id: dto.serviceTypeId },
        select: { id: true },
      }),
      this.prisma.region.findUnique({
        where: { id: dto.regionId },
        select: { id: true },
      }),
    ]);

    if (!service) throw new BadRequestException('serviceTypeId is invalid');
    if (!region) throw new BadRequestException('regionId is invalid');

    return this.prisma.contract.create({
      data: { ...dto, customerId: userId },
    });
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
