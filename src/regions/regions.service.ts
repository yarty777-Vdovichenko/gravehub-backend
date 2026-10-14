import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRegionDto } from './dto/createRegionDto';

@Injectable()
export class RegionsService {
  constructor(private readonly prisma: PrismaService) {}
  getAll() {
    return this.prisma.region.findMany();
  }
  create(dto: CreateRegionDto) {
    return this.prisma.region.create({ data: { name: dto.name } });
  }
}
