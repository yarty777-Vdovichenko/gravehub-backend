import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ListMyContractsDto } from './dto/list-my-contracts.dto';
import { CreateReviewDto } from 'src/reviews/dto/create-review.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';

const RESULT_SELECT = {
  id: true,
  status: true,
  employeeId: true,
} satisfies Prisma.ContractSelect;

@Injectable()
export class ContractWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
    actorId: string,
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
    const contract = await this.prisma.contract.findUniqueOrThrow({
      where: { id },
      select: RESULT_SELECT,
    });
    this.eventEmitter.emit('contract.statusChanged', {
      contractId: id,
      from,
      to,
      actorId,
    });
    return contract;
  }

  async complete(id: string, userId: string) {
    const employeeId = await this.getProfileId(userId);
    return this.transition(
      id,
      { employeeId },
      ContractStatus.in_progress,
      ContractStatus.awaiting_confirmation,
      userId,
    );
  }

  async confirm(id: string, userId: string, dto: CreateReviewDto) {
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const contract = await tx.contract.findFirst({
          where: { id, customerId: userId },
          select: {
            id: true,
            status: true,
            employeeId: true,
          },
        });

        if (!contract) {
          throw new NotFoundException('Contract not found');
        }

        if (
          contract.status !== ContractStatus.awaiting_confirmation ||
          !contract.employeeId
        ) {
          throw new ConflictException('Contract is not awaiting confirmation');
        }

        const { count } = await tx.contract.updateMany({
          where: {
            id,
            customerId: userId,
            status: ContractStatus.awaiting_confirmation,
          },
          data: {
            status: ContractStatus.completed,
          },
        });

        if (count === 0) {
          throw new ConflictException('Contract is not awaiting confirmation');
        }

        const review = await tx.review.create({
          data: {
            contractId: id,
            employeeId: contract.employeeId,
            customerId: userId,
            rating: dto.rating,
            text: dto.text,
          },
        });

        await tx.employeeProfile.update({
          where: { id: contract.employeeId },
          data: {
            reviewsCount: { increment: 1 },
            completedContracts: { increment: 1 },
          },
        });

        const { _avg } = await tx.review.aggregate({
          where: { employeeId: contract.employeeId },
          _avg: { rating: true },
        });

        await tx.employeeProfile.update({
          where: { id: contract.employeeId },
          data: {
            rating: Math.round((_avg.rating ?? 0) * 100) / 100,
          },
        });

        return {
          contract: await tx.contract.findUniqueOrThrow({
            where: { id },
            select: RESULT_SELECT,
          }),
          review,
        };
      });
      this.eventEmitter.emit('contract.statusChanged', {
        contractId: id,
        from: ContractStatus.awaiting_confirmation,
        to: ContractStatus.completed,
        actorId: userId,
      });
      return result;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Review for this contract already exists');
      }

      throw e;
    }
  }

  rejectCompletion(id: string, userId: string) {
    return this.transition(
      id,
      { customerId: userId },
      ContractStatus.awaiting_confirmation,
      ContractStatus.in_progress,
      userId,
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
          serviceTypes: { select: { id: true } },
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
