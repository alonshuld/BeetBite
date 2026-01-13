import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Put,
} from '@nestjs/common';
import { SubcontractorsService } from './subcontractors.service';
import { CreateSubcontractorDto } from './dto/create-subcontractor.dto';
import { UpdateSubcontractorDto } from './dto/update-subcontractor.dto';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SubcontractorResponseDto } from './dto/subcontractor-response.dto';
import { PaginationQueryDto } from 'src/common/pagination-query.dto';

/**
 * Controller for subcontractor-related endpoints.
 * Handles create, read, update, and delete operations.
 * @param subcontractorsService Service providing subcontractor business logic
 */
@ApiTags('subcontractors')
@Controller('subcontractors')
export class SubcontractorsController {
  constructor(private readonly subcontractorsService: SubcontractorsService) {}

  /**
   * Create a new subcontractor.
   * @param createSubcontractorDto Payload with subcontractor properties
   * @returns The created `SubcontractorResponseDTO`
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subcontractor' })
  @ApiCreatedResponse({
    description: 'The subcontractor has been successfully created.',
    type: SubcontractorResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Subcontractor already exists' })
  async create(
    @Body() createSubcontractorDto: CreateSubcontractorDto,
  ): Promise<SubcontractorResponseDto> {
    return await this.subcontractorsService.create(createSubcontractorDto);
  }

  /**
   * Get all subcontractors with pagination.
   * @param pagination Pagination query parameters
   * @returns List of subcontractors
   */
  @Get()
  @ApiOperation({ summary: 'Get all subcontractor with pagination' })
  @ApiOkResponse({
    description: 'List of subcontractors',
    type: SubcontractorResponseDto,
    isArray: true,
  })
  async findAll(
    @Query() pagination?: PaginationQueryDto,
  ): Promise<SubcontractorResponseDto[]> {
    return await this.subcontractorsService.findAll(pagination);
  }

  /**
   * Get a subcontractor by its ID.
   * @param id THe subcontractor identifier
   * @returns Subcontractor with matching ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a subcontractor by ID' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiOkResponse({
    description: 'The subcontractor has beed found.',
    type: SubcontractorResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<SubcontractorResponseDto> {
    return await this.subcontractorsService.findOne(id);
  }

  /**
   * Replace an existing subcontractor (PUT semantics).
   * @param id The subcontractor identifier
   * @param updateSubcontractorDto Full subcontractor DTO for replacement
   * @returns The updated subcontractor
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a subcontractor' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiOkResponse({
    description: 'The subcontractor has been successfully updated.',
    type: SubcontractorResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Subcontractor not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Subcontractor name already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateSubcontractorDto: UpdateSubcontractorDto,
  ): Promise<SubcontractorResponseDto> {
    return await this.subcontractorsService.update(id, updateSubcontractorDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subcontractor' })
  @ApiParam({ name: 'id', description: 'Subcontractor ID' })
  @ApiNoContentResponse({ description: 'Subcontractor not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.subcontractorsService.remove(id);
  }
}
