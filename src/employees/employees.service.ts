import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmployeesQueryDto } from './dto/employees-query.dto';

const employeeSelect = {
  id: true,
  rating: true,
  completedContracts: true,
  user: { select: { id: true, name: true } },
  regions: { select: { id: true, name: true } },
  specialization: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeProfileSelect;

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: EmployeesQueryDto) {
    const where: Prisma.EmployeeProfileWhereInput = {};

    if (query.regionId) {
      where.regions = { some: { id: query.regionId } };
    }

    if (query.serviceId) {
      where.specialization = { some: { id: query.serviceId } };
    }

    if (query.minRating !== undefined) {
      where.rating = { gte: query.minRating };
    }

    if (query.search?.trim()) {
      where.user = {
        name: { contains: query.search.trim(), mode: 'insensitive' },
      };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employeeProfile.findMany({
        where,
        orderBy: { [query.sortBy]: query.order },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: employeeSelect,
      }),
      this.prisma.employeeProfile.count({ where }),
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

  async findOne(id: string) {
    const employee = await this.prisma.employeeProfile.findUnique({
      where: { id },
      select: employeeSelect,
    });

    if (!employee) {
      throw new NotFoundException('Виконавця не знайдено');
    }

    return employee;
  }
}
