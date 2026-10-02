import { Injectable, Logger } from '@nestjs/common';
import { CreateInitiatorDto } from './dto/create-initiator.dto';
import { UpdateInitiatorDto } from './dto/update-initiator.dto';
import { InitiatorResponseDto } from './dto/initiator-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from 'src/generated/client';
import {
  toInitiatorResponse,
  toInitiatorResponseList,
} from './mappers/initiator.mapper';
import { PAGINATION_DEFAULTS, PRISMA_ERROR_CODES } from 'src/common/constants';
import { InitiatorNotFoundError } from './errors/initiator-not-found.error';
import { InitiatorAlreadyExistsError } from './errors/initiator-already-exists.error';

/**
 * Service providing initiator business logic.
 * Handles create, read, update, and delete operations.
 */
@Injectable()
export class InitiatorsService {
  private readonly logger = new Logger(InitiatorsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async create(
    createInitiatorDto: CreateInitiatorDto,
  ): Promise<InitiatorResponseDto> {
    try {
      const initiator = await this.prismaService.initiator.create({
        data: { ...createInitiatorDto },
      });

      this.logger.log(`Initiator created: ${initiator.id}`);

      return toInitiatorResponse(initiator);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError)
        switch (error.code) {
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new InitiatorAlreadyExistsError(createInitiatorDto.name);
        }
      throw error;
    }
  }

  async findAll(
    paginationQuery?: PaginationQueryDto,
  ): Promise<InitiatorResponseDto[]> {
    const page = paginationQuery?.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = paginationQuery?.limit ?? PAGINATION_DEFAULTS.LIMIT;

    const initiators = await this.prismaService.initiator.findMany({
      skip: Math.max(0, (page - 1) * limit),
      take: Math.max(1, limit),
    });

    this.logger.log(`Initiators retrieved: ${initiators.length} items`);

    return toInitiatorResponseList(initiators);
  }

  async findOne(id: string): Promise<InitiatorResponseDto> {
    const initiator = await this.prismaService.initiator.findUnique({
      where: { id },
    });

    if (!initiator) {
      throw new InitiatorNotFoundError(id);
    }

    this.logger.log(`Initiator retrieved: ${id}`);

    return toInitiatorResponse(initiator);
  }

  async update(
    id: string,
    updateInitiatorDto: UpdateInitiatorDto,
  ): Promise<InitiatorResponseDto> {
    try {
      const initiator = await this.prismaService.initiator.update({
        where: { id },
        data: { ...updateInitiatorDto },
      });

      this.logger.log(`Initiator updated: ${id}`);

      return toInitiatorResponse(initiator);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new InitiatorNotFoundError(id);
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new InitiatorAlreadyExistsError(updateInitiatorDto.name);
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.initiator.delete({
        where: { id },
      });

      this.logger.log(`Initiator deleted: ${id}`);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new InitiatorNotFoundError(id);
      }
      throw error;
    }
  }
}
