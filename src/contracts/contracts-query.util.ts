import { Prisma } from '@prisma/client';
import { ContractsQueryDto } from './dto/contracts-query.dto';

export function buildContractWhere(
  query: ContractsQueryDto,
): Prisma.ContractWhereInput {
  const where: Prisma.ContractWhereInput = {};

  if (query.search?.trim()) {
    const search = query.search.trim();
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.serviceId) {
    where.serviceTypeId = query.serviceId;
  }

  if (query.regionId) {
    where.regionId = query.regionId;
  }

  if (query.minBudget !== undefined || query.maxBudget !== undefined) {
    where.budget = {};

    if (query.minBudget !== undefined) {
      where.budget.gte = query.minBudget;
    }

    if (query.maxBudget !== undefined) {
      where.budget.lte = query.maxBudget;
    }
  }

  return where;
}
