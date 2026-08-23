import { Module } from '@nestjs/common';
import { VatRatesService } from './vat-rates.service';
import { VatRatesController } from './vat-rates.controller';

@Module({
  controllers: [VatRatesController],
  providers: [VatRatesService],
  exports: [VatRatesService],
})
export class VatRatesModule {}
