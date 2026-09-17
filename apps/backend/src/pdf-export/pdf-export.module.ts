import { Module } from '@nestjs/common';
import { PdfExportController } from './pdf-export.controller';
import { PdfExportService } from './pdf-export.service';
import { CompanySettingsModule } from 'src/company-settings/company-settings.module';
import { VatRatesModule } from 'src/vat-rates/vat-rates.module';
import { ProjectReportsModule } from 'src/project-reports/project-reports.module';
import { SubcontractorsModule } from 'src/subcontractors/subcontractors.module';
import { ProjectsModule } from 'src/projects/projects.module';

@Module({
  imports: [
    CompanySettingsModule,
    VatRatesModule,
    ProjectReportsModule,
    SubcontractorsModule,
    ProjectsModule,
  ],
  controllers: [PdfExportController],
  providers: [PdfExportService],
})
export class PdfExportModule {}
