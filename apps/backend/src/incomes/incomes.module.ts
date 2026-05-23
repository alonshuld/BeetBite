import { Module } from '@nestjs/common';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';

@Module({
  providers: [IncomesService],
  controllers: [IncomesController],
})
export class IncomesModule {}
