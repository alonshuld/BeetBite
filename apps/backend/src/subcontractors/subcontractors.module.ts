import { Module } from '@nestjs/common';
import { SubcontractorsService } from './subcontractors.service';
import { SubcontractorsController } from './subcontractors.controller';

@Module({
  controllers: [SubcontractorsController],
  providers: [SubcontractorsService],
  exports: [SubcontractorsService],
})
export class SubcontractorsModule {}
