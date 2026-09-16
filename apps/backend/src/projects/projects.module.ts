import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectClientAssignmentsModule } from '../project-client-assignments/project-client-assignments.module';

@Module({
  imports: [ProjectClientAssignmentsModule],
  providers: [ProjectsService],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
