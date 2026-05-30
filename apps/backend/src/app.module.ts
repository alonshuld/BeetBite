import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { CorporationsModule } from './corporations/corporations.module';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { ClientsModule } from './clients/clients.module';
import { SubcontractorsModule } from './subcontractors/subcontractors.module';
import { ProjectsModule } from './projects/projects.module';
import { SubcontractorPaymentsModule } from './subcontractor-payments/subcontractor-payments.module';
import { ProjectReportsModule } from './project-reports/project-reports.module';
import { CorporationPaymentsModule } from './corporation-payments/corporation-payments.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { IncomeModule } from './income/income.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    CorporationPaymentsModule,
    CorporationsModule,
    SubcontractorPaymentsModule,
    SubcontractorsModule,
    ProjectReportsModule,
    ProjectsModule,
    IncomeModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
