import { Module } from '@nestjs/common';
import { ProjectReportsService } from './project-reports.service';
import { ProjectReportsController } from './project-reports.controller';

@Module({
  providers: [ProjectReportsService],
  controllers: [ProjectReportsController],
  exports: [ProjectReportsService],
})
export class ProjectReportsModule {}
