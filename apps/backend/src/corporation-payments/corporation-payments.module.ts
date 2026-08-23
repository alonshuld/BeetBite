import { Module } from '@nestjs/common';
import { CorporationPaymentsController } from './corporation-payments.controller';
import { CorporationPaymentsService } from './corporation-payments.service';
import { VatRatesModule } from 'src/vat-rates/vat-rates.module';

@Module({
  imports: [VatRatesModule],
  controllers: [CorporationPaymentsController],
  providers: [CorporationPaymentsService],
})
export class CorporationPaymentsModule {}
