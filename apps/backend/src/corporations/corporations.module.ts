import { Module } from '@nestjs/common';
import { CorporationsService } from './corporations.service';
import { CorporationsController } from './corporations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CorporationsController],
  providers: [CorporationsService],
})
export class CorporationsModule {}
