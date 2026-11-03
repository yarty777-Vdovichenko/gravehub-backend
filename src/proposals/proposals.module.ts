import { Module } from '@nestjs/common';
import { CustomerProposalsController } from './customer-proposals.controller';
import { EmployeeProposalsController } from './employee-proposals.controller';
import { ProposalsService } from './proposals.service';

@Module({
  controllers: [EmployeeProposalsController, CustomerProposalsController],
  providers: [ProposalsService],
})
export class ProposalsModule {}
