import { Module } from '@nestjs/common';
import { CorporationsModule } from './corporations/corporations.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { ClientsModule } from './clients/clients.module';
import { SubcontractorsModule } from './subcontractors/subcontractors.module';
import { ProjectsModule } from './projects/projects.module';
import { IncomesModule } from './incomes/incomes.module';
import { SubcontractorPaymentsModule } from './subcontractor-payments/subcontractor-payments.module';
import { ProjectReportsModule } from './project-reports/project-reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),
    PrismaModule,
    CorporationsModule,
    ClientsModule,
    SubcontractorPaymentsModule,
    SubcontractorsModule,
    ProjectsModule,
    IncomesModule,
    ProjectReportsModule,
  ],
})
export class AppModule {}
