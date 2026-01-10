import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import {
  toClientResponse,
  toClientResponseList,
} from './mappers/clients.mapper';
import { PrismaClientKnownRequestError } from 'src/generated/internal/prismaNamespace';
import { PRISMA_ERROR_CODES, PAGINATION_DEFAULTS } from 'src/common/constants';
import { ClientAlreadyExistsError } from './errors/client-already-exists.exception';
import { ClientNotFoundError } from './errors/client-not-found.exception';
import { PaginationQueryDto } from '../common/pagination-query.dto';

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Creates a new client.
   * @param createClientDto The DTO containing client details.
   * @returns The created client.
   */
  async create(createClientDto: CreateClientDto): Promise<ClientResponseDto> {
    try {
      const createdClient = await this.prismaService.client.create({
        data: { ...createClientDto },
      });
      this.logger.log(`Client created: ${createdClient.id}`);

      return toClientResponse(createdClient);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED
      ) {
        throw new ClientAlreadyExistsError(createClientDto.name);
      }
      throw error;
    }
  }

  /**
   * Finds all clients with pagination.
   * @param paginationQuery The pagination query parameters.
   * @returns A list of clients.
   */
  async findAll(
    paginationQuery?: PaginationQueryDto,
  ): Promise<ClientResponseDto[]> {
    const page = paginationQuery?.page ?? PAGINATION_DEFAULTS.PAGE;
    const limit = paginationQuery?.limit ?? PAGINATION_DEFAULTS.LIMIT;

    const clients = await this.prismaService.client.findMany({
      skip: Math.max(0, (page - 1) * limit),
      take: Math.max(1, limit),
    });

    this.logger.log(`Clients retrieved: ${clients.length} items`);
    return toClientResponseList(clients);
  }

  /**
   * Finds a client by its ID.
   * @param id ID of the client to find.
   * @returns The found client.
   */
  async findOne(id: string): Promise<ClientResponseDto> {
    const client = await this.prismaService.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new ClientNotFoundError(id);
    }

    this.logger.log(`Client retrieved: ${id}`);
    return toClientResponse(client);
  }

  /**
   * Updates a client by its ID.
   * @param id ID of the client to update
   * @param updateClientDto The DTO containing updated client details.
   * @returns The updated client.
   */
  async update(
    id: string,
    updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    try {
      const client = await this.prismaService.client.update({
        where: { id },
        data: { ...updateClientDto },
      });

      this.logger.log(`Client updated: ${id}`);
      return toClientResponse(client);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
          case PRISMA_ERROR_CODES.NOT_FOUND:
            throw new ClientNotFoundError(id);
          case PRISMA_ERROR_CODES.UNIQUE_CONSTRAINT_FAILED:
            throw new ClientAlreadyExistsError(updateClientDto.name);
        }
      }
      throw error;
    }
  }

  /**
   * Removes a client by its ID.
   * @param id ID of the client to remove
   * @returns void
   */
  async remove(id: string): Promise<void> {
    try {
      await this.prismaService.client.delete({
        where: { id },
      });

      this.logger.log(`Client deleted: ${id}`);
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === PRISMA_ERROR_CODES.NOT_FOUND
      ) {
        throw new ClientNotFoundError(id);
      }
      throw error;
    }
  }
}
