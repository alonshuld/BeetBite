import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { UsersService } from './users.service';

/**
 * Module providing user lookups.
 * Exports UsersService for use by AuthModule.
 */
@Module({
  imports: [PrismaModule],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
