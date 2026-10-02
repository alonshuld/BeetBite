import { Module } from '@nestjs/common';
import { InitiatorsService } from './initiators.service';
import { InitiatorsController } from './initiators.controller';

@Module({
  controllers: [InitiatorsController],
  providers: [InitiatorsService],
  exports: [InitiatorsService],
})
export class InitiatorsModule {}
