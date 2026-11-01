import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { Prisma, ProposalStatus } from '@prisma/client';
import { ListProposalsDto } from './dto/list-proposals.dto';

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getProfileId(userId: string) {
    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('Employee profile not found');
    return profile.id;
  }
  async propose(contractId: string, userId: string, dto: CreateProposalDto) {
    const profile = await this.prisma.employeeProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) throw new ForbiddenException('Employee profile not found');

    const contract = await this.prisma.contract.findFirst({
      where: {
        id: contractId,
        status: 'open',
        customerId: { not: userId },
        region: { employees: { some: { userId } } },
      },
      select: { id: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');

    try {
      return await this.prisma.proposal.create({
        data: {
          contractId,
          employeeId: profile.id,
          price: dto.price,
          comment: dto.comment,
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'You already submitted a proposal for this contract',
        );
      }
      throw e;
    }
  }
  async cancel(proposalId: string, userId: string) {
    const employeeId = await this.getProfileId(userId);
    const { count } = await this.prisma.proposal.deleteMany({
      where: {
        id: proposalId,
        employeeId,
        status: ProposalStatus.pending,
        contract: { status: 'open' },
      },
    });
    if (count === 0) throw new NotFoundException('Proposal not found');
  }

  async listMy(userId: string, dto: ListProposalsDto) {
    const employeeId = await this.getProfileId(userId);
    const where: Prisma.ProposalWhereInput = {
      employeeId,
      ...(dto.status && { status: dto.status }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.proposal.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        select: {
          id: true,
          price: true,
          comment: true,
          status: true,
          createdAt: true,
          contract: {
            select: { id: true, title: true, status: true, budget: true },
          },
        },
      }),
      this.prisma.proposal.count({ where }),
    ]);
    return {
      items,
      total,
      page: dto.page,
      limit: dto.limit,
      totalPages: Math.ceil(total / dto.limit),
    };
  }

  async listForContract(
    contractId: string,
    userId: string,
    dto: ListProposalsDto,
  ) {
    const owned = await this.prisma.contract.findFirst({
      where: { id: contractId, customerId: userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Contract not found');

    const where: Prisma.ProposalWhereInput = {
      contractId,
      ...(dto.status && { status: dto.status }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.proposal.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        select: {
          id: true,
          price: true,
          comment: true,
          status: true,
          createdAt: true,
          employee: { select: { id: true } },
        },
      }),
      this.prisma.proposal.count({ where }),
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
