import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  providers: [ProjectsService],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
