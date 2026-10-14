import { Body, Controller, Get, Post } from '@nestjs/common';
import { RegionsService } from './regions.service';
import { createRegionDto } from './dto/createRegionDto';

@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}
  @Get()
  getAll() {
    return this.regionsService.getAll();
  }
  @Post('')
  create(@Body() dto: createRegionDto) {
    return this.regionsService.create(dto);
  }
}
