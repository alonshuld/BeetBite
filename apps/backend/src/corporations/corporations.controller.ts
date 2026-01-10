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
} from '@nestjs/swagger';
import { CorporationsService } from './corporations.service';
import { CreateCorporationDto } from './dto/create-corporation.dto';
import { UpdateCorporationDto } from './dto/update-corporation.dto';
import { CorporationResponseDto } from './dto/corporation-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';

/**
 * Controller for corporation-related endpoints.
 * Handles create, read, update, and delete operations.
 * @param corporationsService Service providing corporation business logic
 */
@ApiTags('corporations')
@Controller('corporations')
export class CorporationsController {
  constructor(private readonly corporationsService: CorporationsService) {}

  /**
   * Create a new corporation.
   * @param createCorporationDto Payload with corporation properties
   * @returns The created corporation
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new corporation' })
  @ApiCreatedResponse({
    description: 'The corporation has been successfully created.',
    type: CorporationResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Corporation already exists' })
  async create(
    @Body() createCorporationDto: CreateCorporationDto,
  ): Promise<CorporationResponseDto> {
    return await this.corporationsService.create(createCorporationDto);
  }

  /**
   * Retrieve all corporations.
   * @param pagination Pagination query parameters
   * @returns List of corporation
   */
  @Get()
  @ApiOperation({ summary: 'Get all corporations with pagination' })
  @ApiOkResponse({
    description: 'List of corporations',
    type: CorporationResponseDto,
    isArray: true,
  })
  async findAll(
    @Query() pagination?: PaginationQueryDto,
  ): Promise<CorporationResponseDto[]> {
    return await this.corporationsService.findAll(pagination);
  }

  /**
   * Retrieve a corporation by its ID.
   * @param id The corporation identifier
   * @returns Corporation with matching ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a corporation by ID' })
  @ApiParam({ name: 'id', description: 'Corporation ID' })
  @ApiOkResponse({
    description: 'The corporation has been found.',
    type: CorporationResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<CorporationResponseDto> {
    return await this.corporationsService.findOne(id);
  }

  /**
   * Replace an existing corporation (PUT semantics).
   * @param id The corporation identifier
   * @param updateCorporationDto Full corporation DTO for replacement
   * @returns The updated corporation
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a corporation' })
  @ApiParam({ name: 'id', description: 'Corporation ID' })
  @ApiOkResponse({
    description: 'The corporation has been successfully updated.',
    type: CorporationResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Corporation not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Corporation name already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateCorporationDto: UpdateCorporationDto,
  ): Promise<CorporationResponseDto> {
    return this.corporationsService.update(id, updateCorporationDto);
  }

  /**
   * Delete a corporation by ID.
   * @param id The corporation identifier
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a corporation' })
  @ApiParam({ name: 'id', description: 'Corporation ID' })
  @ApiNoContentResponse({
    description: 'The corporation has been successfully deleted.',
  })
  @ApiNotFoundResponse({ description: 'Corporation not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.corporationsService.remove(id);
  }
}
