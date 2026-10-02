import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { HealthResponseDto } from './dto/health-response.dto';

/**
 * Liveness probe for the deploy script and the external uptime monitor.
 * Public, and it touches the database, so a 200 means the whole request path
 * (proxy → API → PostgreSQL) works.
 * @param prisma Prisma client used to prove the database answers
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Report whether the API can reach the database.
   * @returns `{ status: 'ok' }` when a trivial query succeeds
   * @throws ServiceUnavailableException when the database does not answer
   */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Check that the API and its database are up' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ description: 'Database unreachable' })
  async check(): Promise<HealthResponseDto> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database unreachable');
    }
    return { status: 'ok' };
  }
}
