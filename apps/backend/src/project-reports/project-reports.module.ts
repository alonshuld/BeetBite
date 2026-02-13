import { Module } from '@nestjs/common';
import { ProjectReportsService } from './project-reports.service';

@Module({
  providers: [ProjectReportsService]
})
export class ProjectReportsModule {}
