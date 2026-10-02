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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier-response.dto';
import { PaginationQueryDto } from '../common/pagination-query.dto';

/**
 * Controller for supplier-related endpoints.
 * Handles create, read, update, and delete operations.
 * @param suppliersService Service providing supplier business logic
 */
@ApiBearerAuth()
@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * Create a new supplier.
   * @param createSupplierDto Payload with supplier properties
   * @returns The created supplier
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new supplier' })
  @ApiCreatedResponse({
    description: 'The supplier has been successfully created.',
    type: SupplierResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Supplier already exists' })
  async create(
    @Body() createSupplierDto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return await this.suppliersService.create(createSupplierDto);
  }

  /**
   * Retrieve all suppliers.
   * @param pagination Pagination query parameters
   * @returns List of supplier
   */
  @Get()
  @ApiOperation({ summary: 'Get all suppliers with pagination' })
  @ApiOkResponse({
    description: 'List of suppliers',
    type: SupplierResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid pagination parameters' })
  async findAll(
    @Query() pagination?: PaginationQueryDto,
  ): Promise<SupplierResponseDto[]> {
    return await this.suppliersService.findAll(pagination);
  }

  /**
   * Retrieve a supplier by its ID.
   * @param id The supplier identifier
   * @returns Supplier with matching ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a supplier by ID' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  @ApiOkResponse({
    description: 'The supplier has been found.',
    type: SupplierResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  async findOne(@Param('id') id: string): Promise<SupplierResponseDto> {
    return await this.suppliersService.findOne(id);
  }

  /**
   * Replace an existing supplier (PUT semantics).
   * @param id The supplier identifier
   * @param updateSupplierDto Full supplier DTO for replacement
   * @returns The updated supplier
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  @ApiOkResponse({
    description: 'The supplier has been successfully updated.',
    type: SupplierResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  @ApiConflictResponse({ description: 'Supplier name already exists' })
  async update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  /**
   * Delete a supplier by ID.
   * @param id The supplier identifier
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  @ApiNoContentResponse({
    description: 'The supplier has been successfully deleted.',
  })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.suppliersService.remove(id);
  }
}
