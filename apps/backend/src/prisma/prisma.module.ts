import { Global, Module } from '@nestjs/common';
import { PrismaService as PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule { }
