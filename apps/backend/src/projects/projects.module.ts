import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { ProjectClientAssignmentsModule } from '../project-client-assignments/project-client-assignments.module';
import { VatRatesModule } from '../vat-rates/vat-rates.module';

@Module({
  imports: [ProjectClientAssignmentsModule, VatRatesModule],
  providers: [ProjectsService],
  controllers: [ProjectsController],
  exports: [ProjectsService],
})
export class ProjectsModule {}
