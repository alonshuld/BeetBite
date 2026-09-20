import { EntityHasRelatedRecordsError } from 'src/common/errors/entity-has-related-records.error';
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

/**
 * Service for managing clients.
 * Provides methods to create, read, update, and delete clients.
 * @param prismaService PrismaService for database interactions
 */
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
   * Removes a client, refusing if it has ever owned a project.
   *
   * This used to hard-cascade through the client's projects, reports, income
   * entries and payments. Once projects can be transferred between clients
   * that cascade destroys data belonging to somebody else: a project
   * moved from client B to client A carries B's months with it, so deleting A
   * would take B's history too. A client that has ever held a project is
   * therefore refused, and the message names the projects standing in the way.
   *
   * A client with no projects — one created by mistake, say — still deletes.
   *
   * @param id ID of the client to remove
   * @returns void
   * @throws ClientNotFoundError when no client has that id
   * @throws EntityHasRelatedRecordsError when the client has ever owned a project
   */
  async remove(id: string): Promise<void> {
    const client = await this.prismaService.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new ClientNotFoundError(id);
    }

    // Every project has an assignment to each client that has ever owned it,
    // so this catches both projects the client holds now and ones it has since
    // handed over.
    const assignments =
      await this.prismaService.projectClientAssignment.findMany({
        where: { clientId: id },
        select: { project: { select: { name: true } } },
      });

    if (assignments.length > 0) {
      const names = Array.from(
        new Set(assignments.map((a) => a.project.name)),
      ).sort();
      throw new EntityHasRelatedRecordsError(
        `client "${client.name}"`,
        `projects (${names.join(', ')})`,
      );
    }

    await this.prismaService.client.delete({ where: { id } });

    this.logger.log(`Client deleted: ${id}`);
  }
}
