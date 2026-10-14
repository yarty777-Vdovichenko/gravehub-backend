import { Module } from '@nestjs/common';
import { RegionsService } from './regions.service';
import { RegionsController } from './regions.controller';

@Module({
  controllers: [RegionsController],
  imports: [],
  providers: [RegionsService],
})
export class RegionsModule {}
