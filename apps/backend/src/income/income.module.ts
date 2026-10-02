import { Module } from '@nestjs/common';
import { ProjectClientAssignmentsModule } from '../project-client-assignments/project-client-assignments.module';
import { IncomeController } from './income.controller';
import { IncomeService } from './income.service';

@Module({
  imports: [ProjectClientAssignmentsModule],
  controllers: [IncomeController],
  providers: [IncomeService],
})
export class IncomeModule {}
