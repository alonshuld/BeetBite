import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import { SuppliersModule } from './suppliers/suppliers.module';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { ClientsModule } from './clients/clients.module';
import { SubcontractorsModule } from './subcontractors/subcontractors.module';
import { ProjectsModule } from './projects/projects.module';
import { SubcontractorPaymentsModule } from './subcontractor-payments/subcontractor-payments.module';
import { ProjectReportsModule } from './project-reports/project-reports.module';
import { SupplierPaymentsModule } from './supplier-payments/supplier-payments.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { IncomeModule } from './income/income.module';
import { CompanySettingsModule } from './company-settings/company-settings.module';
import { VatRatesModule } from './vat-rates/vat-rates.module';
import { PdfExportModule } from './pdf-export/pdf-export.module';

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
    SupplierPaymentsModule,
    SuppliersModule,
    SubcontractorPaymentsModule,
    SubcontractorsModule,
    ProjectReportsModule,
    ProjectsModule,
    IncomeModule,
    CompanySettingsModule,
    VatRatesModule,
    PdfExportModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
