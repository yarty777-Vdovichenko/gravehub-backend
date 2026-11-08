import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ContractsQueryDto } from './dto/contracts-query.dto';
import { buildContractWhere } from './contracts-query.util';

@Injectable()
export class EmployeeContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOpenContractsPaginated(query: ContractsQueryDto, userId: string) {
    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      select: { regions: { select: { id: true } } },
    });
    const regionIds = profile?.regions.map((region) => region.id) ?? [];
    const where: Prisma.ContractWhereInput = {
      AND: [
        buildContractWhere(query),
        { status: 'open' },
        { regionId: { in: regionIds } },
      ],
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        include: {
          region: true,
          serviceType: true,
          customer: { select: { id: true, name: true } },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { [query.sortBy]: query.order },
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

  async getOpenContractById(id: string, userId: string) {
    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('Employee profile not found');

    const contract = await this.prisma.contract.findFirst({
      where: {
        id,
        OR: [
          { status: 'open', region: { employees: { some: { userId } } } },
          { employeeId: profile.id },
        ],
      },
      include: {
        region: true,
        serviceType: true,
        customer: { select: { id: true, name: true } },
      },
    });

    if (!contract) throw new NotFoundException('Contract not found');
    return contract;
  }
}
