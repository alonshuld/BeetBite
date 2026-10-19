import { Module } from '@nestjs/common';
import { ProjectClientAssignmentsModule } from '../project-client-assignments/project-client-assignments.module';
import { VatRatesModule } from '../vat-rates/vat-rates.module';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';
import { ClientPaymentsController } from './client-payments.controller';
import { ClientPaymentsService } from './client-payments.service';

@Module({
  imports: [ProjectClientAssignmentsModule, VatRatesModule],
  controllers: [IncomeController, ClientPaymentsController],
  providers: [IncomeService, ClientPaymentsService],
})
export class IncomeModule {}
