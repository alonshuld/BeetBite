import { Module } from '@nestjs/common';
import { ProjectClientAssignmentsModule } from '../project-client-assignments/project-client-assignments.module';
import { VatRatesModule } from '../vat-rates/vat-rates.module';
import { ProjectReportsService } from './project-reports.service';
import { ProjectReportsController } from './project-reports.controller';

@Module({
  imports: [ProjectClientAssignmentsModule, VatRatesModule],
  providers: [ProjectReportsService],
  controllers: [ProjectReportsController],
  exports: [ProjectReportsService],
})
export class ProjectReportsModule {}
