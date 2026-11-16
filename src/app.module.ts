import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { RegionsModule } from './regions/regions.module';
import { ContractsModule } from './contracts/contracts.module';
import { ProposalsModule } from './proposals/proposals.module';
import { ReviewsModule } from './reviews/reviews.module';
import { EmployeesModule } from './employees/employees.module';
import { PlotsModule } from './plots/plots.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ChatModule } from './chat/chat.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    EventEmitterModule.forRoot(),
    AuthModule,
    ServicesModule,
    RegionsModule,
    ContractsModule,
    ProposalsModule,
    ReviewsModule,
    EmployeesModule,
    PlotsModule,
    ChatModule,
    NotificationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
