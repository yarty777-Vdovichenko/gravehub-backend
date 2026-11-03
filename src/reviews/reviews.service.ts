import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(contractId: string, userId: string, dto: CreateReviewDto) {
    const contract = await this.prisma.contract.findFirst({
      where: { id: contractId, customerId: userId },
      select: { status: true, employeeId: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    if (contract.status !== ContractStatus.completed || !contract.employeeId) {
      throw new ConflictException('Contract is not completed');
    }
    const employeeId = contract.employeeId;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const review = await tx.review.create({
          data: {
            contractId,
            employeeId,
            customerId: userId,
            rating: dto.rating,
            text: dto.text,
          },
          select: {
            id: true,
            contractId: true,
            rating: true,
            text: true,
            createdAt: true,
          },
        });

        // Бере блокування рядка профілю: паралельні відгуки йдуть по черзі.
        await tx.employeeProfile.update({
          where: { id: employeeId },
          data: { reviewsCount: { increment: 1 } },
        });

        // Агрегат рахується вже після блокування і бачить усі закомічені відгуки.
        const { _avg } = await tx.review.aggregate({
          where: { employeeId },
          _avg: { rating: true },
        });
        await tx.employeeProfile.update({
          where: { id: employeeId },
          data: { rating: Math.round((_avg.rating ?? 0) * 100) / 100 },
        });

        return review;
      });
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

  async listForEmployee(employeeId: string, dto: ListReviewsDto) {
    const exists = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Employee not found');

    const where: Prisma.ReviewWhereInput = { employeeId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.review.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
        select: {
          id: true,
          rating: true,
          text: true,
          createdAt: true,
          customer: { select: { name: true } },
        },
      }),
      this.prisma.review.count({ where }),
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
