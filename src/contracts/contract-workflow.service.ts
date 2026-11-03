import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListMyContractsDto } from './dto/list-my-contracts.dto';

const RESULT_SELECT = {
  id: true,
  status: true,
  employeeId: true,
} satisfies Prisma.ContractSelect;

@Injectable()
export class ContractWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  private async getProfileId(userId: string) {
    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('Employee profile not found');
    return profile.id;
  }

  private async transition(
    id: string,
    owner: Prisma.ContractWhereInput,
    from: ContractStatus,
    to: ContractStatus,
  ) {
    const { count } = await this.prisma.contract.updateMany({
      where: { id, status: from, ...owner },
      data: { status: to },
    });
    if (count === 0) {
      const exists = await this.prisma.contract.findFirst({
        where: { id, ...owner },
        select: { id: true },
      });
      if (!exists) throw new NotFoundException('Contract not found');
      throw new ConflictException('Contract is not in the required status');
    }
    return this.prisma.contract.findUniqueOrThrow({
      where: { id },
      select: RESULT_SELECT,
    });
  }

  async complete(id: string, userId: string) {
    const employeeId = await this.getProfileId(userId);
    return this.transition(
      id,
      { employeeId },
      ContractStatus.in_progress,
      ContractStatus.awaiting_confirmation,
    );
  }

  async confirm(id: string, userId: string) {
    const contract = await this.transition(
      id,
      { customerId: userId },
      ContractStatus.awaiting_confirmation,
      ContractStatus.completed,
    );
    if (contract.employeeId) {
      await this.prisma.employeeProfile.update({
        where: { id: contract.employeeId },
        data: { completedContracts: { increment: 1 } },
      });
    }
    return contract;
  }

  rejectCompletion(id: string, userId: string) {
    return this.transition(
      id,
      { customerId: userId },
      ContractStatus.awaiting_confirmation,
      ContractStatus.in_progress,
    );
  }

  async listMy(userId: string, dto: ListMyContractsDto) {
    const employeeId = await this.getProfileId(userId);
    const where: Prisma.ContractWhereInput = {
      employeeId,
      ...(dto.status && { status: dto.status }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.contract.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        select: {
          id: true,
          title: true,
          status: true,
          budget: true,
          date: true,
          createdAt: true,
          regionId: true,
          serviceTypeId: true,
        },
      }),
      this.prisma.contract.count({ where }),
    ]);
    return {
      items,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit),
    };
  }
}
