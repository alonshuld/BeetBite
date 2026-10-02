import { Module } from '@nestjs/common';
import { ProjectClientAssignmentsService } from './project-client-assignments.service';
import { ProjectClientAssignmentsController } from './project-client-assignments.controller';

/**
 * Owns the effective-dated project-to-client relationship.
 *
 * Exports its service because every month-scoped read path needs
 * `resolveClientsForMonth` to answer "who owned this project that month?".
 */
@Module({
  controllers: [ProjectClientAssignmentsController],
  providers: [ProjectClientAssignmentsService],
  exports: [ProjectClientAssignmentsService],
})
export class ProjectClientAssignmentsModule {}
