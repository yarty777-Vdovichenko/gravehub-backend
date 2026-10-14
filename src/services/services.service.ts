import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateServiceDto } from './dto/createService.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  getAll() {
    return this.prisma.service.findMany();
  }

  create(dto: CreateServiceDto) {
    return this.prisma.service.create({ data: dto });
  }
}
