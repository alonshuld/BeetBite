import { Module } from '@nestjs/common';
import { CorporationPaymentsController } from './corporation-payments.controller';
import { CorporationPaymentsService } from './corporation-payments.service';

@Module({
  controllers: [CorporationPaymentsController],
  providers: [CorporationPaymentsService],
})
export class CorporationPaymentsModule {}
