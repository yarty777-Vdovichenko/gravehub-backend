import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceDto } from './dto/createService.dto';
import {
  selectableServiceWhere,
  serviceCategoryWhere,
} from './services-query.util';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  getAll() {
    return this.prisma.service.findMany({
      where: serviceCategoryWhere,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        children: {
          where: selectableServiceWhere,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
          },
        },
      },
    });
  }

  create(dto: CreateServiceDto) {
    return this.prisma.service.create({ data: dto });
  }
}
