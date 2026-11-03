import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { EmployeeContractsController } from './employee-contracts.controller';
import { EmployeeContractsService } from './employee-contracts.service';
import { ContractWorkflowController } from './contract-workflow.controller';
import { EmployeeContractWorkflowController } from './employee-contract-workflow.controller';
import { ContractWorkflowService } from './contract-workflow.service';

@Module({
  controllers: [
    ContractsController,
    EmployeeContractsController,
    ContractWorkflowController,
    EmployeeContractWorkflowController,
  ],
  providers: [
    ContractsService,
    EmployeeContractsService,
    ContractWorkflowService,
  ],
})
export class ContractsModule {}
