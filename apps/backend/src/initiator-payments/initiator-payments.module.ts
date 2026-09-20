import { Module } from '@nestjs/common';
import { InitiatorPaymentsService } from './initiator-payments.service';
import { InitiatorPaymentsController } from './initiator-payments.controller';

@Module({
  controllers: [InitiatorPaymentsController],
  providers: [InitiatorPaymentsService],
})
export class InitiatorPaymentsModule {}
