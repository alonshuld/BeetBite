import { Module } from '@nestjs/common';
import { ProjectClientAssignmentsModule } from '../project-client-assignments/project-client-assignments.module';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { SubcontractorPaymentsController } from './subcontractor-payments.controller';

@Module({
  imports: [ProjectClientAssignmentsModule],
  controllers: [SubcontractorPaymentsController],
  providers: [SubcontractorPaymentsService],
  exports: [SubcontractorPaymentsService],
})
export class SubcontractorPaymentsModule {}
