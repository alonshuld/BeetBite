import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const url = configService.get<string>('DATABASE_URL');

    if (!url) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }

    // Pass the connection string directly to the adapter
    const adapter = new PrismaPg({
      connectionString: url,
    });

    super({ adapter });
    // ConfigService is only needed in constructor, no need to store as property
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error(
        `Failed to connect to database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error(
        `Error disconnecting from database: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
