import { Module } from '@nestjs/common';
import { ContractProposalsController } from './customer-proposals.controller';
import { EmployeeProposalsController } from './employee-proposals.controller';
import { ProposalsService } from './proposals.service';

@Module({
  controllers: [EmployeeProposalsController, ContractProposalsController],
  providers: [ProposalsService],
})
export class ProposalsModule {}
