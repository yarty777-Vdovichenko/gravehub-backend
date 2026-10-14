import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  controllers: [ServicesController],
  imports: [],
  providers: [ServicesService],
})
export class ServicesModule {}
