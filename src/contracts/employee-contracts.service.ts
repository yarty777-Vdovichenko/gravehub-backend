import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EmployeeContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOpenContractsPaginated(page: number, limit: number, userId: string) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where: {
          status: 'open',
          region: { employees: { some: { userId } } },
        },
        include: {
          region: true,
          serviceType: true,
          customer: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.contract.count({
        where: {
          status: 'open',
          region: { employees: { some: { userId } } },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOpenContractById(id: string, userId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: {
        id,
        status: 'open',
        region: { employees: { some: { userId } } },
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
