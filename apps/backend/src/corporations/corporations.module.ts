import { Module } from '@nestjs/common';
import { CorporationsService } from './corporations.service';
import { CorporationsController } from './corporations.controller';

@Module({
  controllers: [CorporationsController],
  providers: [CorporationsService],
})
export class CorporationsModule {}
