import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DatabaseURLError } from './errors/database-url.error';

/**
 * Prisma service for database interactions.
 * Manages the lifecycle of the Prisma client.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const url = configService.get<string>('DATABASE_URL');

    if (!url) {
      throw new DatabaseURLError();
    }

    const adapter = new PrismaPg({
      connectionString: url,
    });

    super({ adapter });
  }

  /**
   * Connects to the database when the module is initialized.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnects from the database when the module is destroyed.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
