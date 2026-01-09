import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from 'src/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { DatabaseURLError } from './errors/database-url.error';

@Injectable()
export class PrismaService extends PrismaClient {
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
}
