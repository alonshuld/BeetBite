import { Module } from '@nestjs/common';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { SubcontractorPaymentsController } from './subcontractor-payments.controller';

@Module({
  controllers: [SubcontractorPaymentsController],
  providers: [SubcontractorPaymentsService],
})
export class SubcontractorPaymentsModule {}
