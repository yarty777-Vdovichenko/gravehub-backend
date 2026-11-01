import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { RegionsModule } from './regions/regions.module';
import { ContractsModule } from './contracts/contracts.module';
import { ProposalsModule } from './proposals/proposals.module';

@Module({
  imports: [PrismaModule, AuthModule, ServicesModule, RegionsModule, ContractsModule, ProposalsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
