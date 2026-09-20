import { Module } from '@nestjs/common';
import { ProjectClientAssignmentsModule } from '../project-client-assignments/project-client-assignments.module';
import { ProjectReportsService } from './project-reports.service';
import { ProjectReportsController } from './project-reports.controller';

@Module({
  imports: [ProjectClientAssignmentsModule],
  providers: [ProjectReportsService],
  controllers: [ProjectReportsController],
  exports: [ProjectReportsService],
})
export class ProjectReportsModule {}
