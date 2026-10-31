import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { EmployeeContractsController } from './employee-contracts.controller';
import { EmployeeContractsService } from './employee-contracts.service';

@Module({
  controllers: [ContractsController, EmployeeContractsController],
  providers: [ContractsService, EmployeeContractsService],
})
export class ContractsModule {}
