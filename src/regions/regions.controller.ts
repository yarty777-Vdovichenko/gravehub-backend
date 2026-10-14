import { Body, Controller, Get, Post } from '@nestjs/common';
import { RegionsService } from './regions.service';
import { CreateRegionDto } from './dto/createRegionDto';

@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}
  @Get()
  getAll() {
    return this.regionsService.getAll();
  }
  @Post('')
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }
}
