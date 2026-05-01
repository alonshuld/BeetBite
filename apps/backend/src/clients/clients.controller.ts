import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';

/**
 * Controller for client-related endpoints.
 * Handles create, read, update (PUT), and delete operations.
 * @param clientsService Service providing client business logic
 */
@ApiBearerAuth()
@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  /**
   * Create a new client.
   * @param createClientDto Payload with client properties
   * @returns The created `ClientResponseDto`
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new client' })
  @ApiCreatedResponse({
    description: 'The client has been successfully created.',
    type: ClientResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Client already exists' })
  async create(
    @Body() createClientDto: CreateClientDto,
  ): Promise<ClientResponseDto> {
    return await this.clientsService.create(createClientDto);
  }

  /**
   * Retrieve all clients.
   * @param pagination Optional pagination query parameters (page and limit).
   * @returns An array of `ClientResponseDto`
   */
  @Get()
  @ApiOperation({ summary: 'Get all clients with pagination' })
  @ApiOkResponse({
    description: 'List of clients',
    type: ClientResponseDto,
    isArray: true,
  })
  async findAll(
    @Query() pagination?: PaginationQueryDto,
  ): Promise<ClientResponseDto[]> {
    return await this.clientsService.findAll(pagination);
  }

  /**
   * Retrieve a client by its ID.
   * @param id The client identifier
   * @returns The found `ClientResponseDto`
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a client by ID' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiOkResponse({
    description: 'The client has been found.',
    type: ClientResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<ClientResponseDto> {
    return await this.clientsService.findOne(id);
  }

  /**
   * Replace an existing client (PUT semantics).
   * Expects a full `UpdateClientDto` payload to replace the resource.
   * @param id The client identifier
   * @param updateClientDto Full client DTO for replacement
   * @returns The updated `ClientResponseDto`
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a client' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiOkResponse({
    description: 'The client has been successfully updated.',
    type: ClientResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Client not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Client name already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return this.clientsService.update(id, updateClientDto);
  }

  /**
   * Delete a client by ID.
   * @param id The client identifier
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a client' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiNoContentResponse({
    description: 'The client has been successfully deleted.',
  })
  @ApiNotFoundResponse({ description: 'Client not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.clientsService.remove(id);
  }
}
