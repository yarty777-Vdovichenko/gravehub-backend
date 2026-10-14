import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ServicesModule } from './services/services.module';
import { RegionsModule } from './regions/regions.module';

@Module({
  imports: [PrismaModule, AuthModule, ServicesModule, RegionsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
