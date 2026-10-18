import { Module } from '@nestjs/common';
import { ProjectClientAssignmentsModule } from '../project-client-assignments/project-client-assignments.module';
import { VatRatesModule } from '../vat-rates/vat-rates.module';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';

@Module({
  imports: [ProjectClientAssignmentsModule, VatRatesModule],
  controllers: [IncomeController],
  providers: [IncomeService],
})
export class IncomeModule {}
