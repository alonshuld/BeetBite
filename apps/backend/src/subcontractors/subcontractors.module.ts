import { Module } from '@nestjs/common';
import { SubcontractorsService } from './subcontractors.service';
import { SubcontractorsController } from './subcontractors.controller';
import { SubcontractorTeamsService } from './subcontractor-teams.service';
import { SubcontractorTeamsController } from './subcontractor-teams.controller';

@Module({
  controllers: [SubcontractorsController, SubcontractorTeamsController],
  providers: [SubcontractorsService, SubcontractorTeamsService],
  exports: [SubcontractorsService, SubcontractorTeamsService],
})
export class SubcontractorsModule {}
