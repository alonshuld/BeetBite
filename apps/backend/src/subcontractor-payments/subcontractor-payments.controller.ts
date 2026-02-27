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
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { UpdateSubcontractorPaymentDto } from './dto/update-subcontractor-payment.dto';
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
import { SubcontractorPaymentResponseDto } from './dto/subcontractor-payments-response.dto';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';

/**
 * Controller for subcontractor payment-related endpoints.
 * Handles create, read, update, and delete operations.
 * @param subcontractorPaymentsService Service providing subcontractor payment business logic
 */
@ApiTags('subcontractors/payments')
@Controller('subcontractors/payments')
export class SubcontractorPaymentsController {
  constructor(
    private readonly subcontractorPaymentsService: SubcontractorPaymentsService,
  ) {}

  /**
   * Create a new subcontractor payment.
   * @param createSubcontractorPaymentDto Payload with subcontractor payment properties
   * @returns The created subcontractor payment
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subcontractor payment' })
  @ApiCreatedResponse({
    description: 'The subcontractor payment has been successfully created.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for creating subcontractor payment.',
  })
  @ApiConflictResponse({
    description: 'Conflict occurred while creating subcontractor payment.',
  })
  async create(
    @Body() createSubcontractorPaymentDto: CreateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    return await this.subcontractorPaymentsService.create(
      createSubcontractorPaymentDto,
    );
  }

  /**
   * Find all subcontractor payments.
   * @returns A list of subcontractor payments
   */
  @Get()
  @ApiOperation({ summary: 'Get all subcontractor payments' })
  @ApiOkResponse({
    description: 'List of subcontractor payments.',
    type: SubcontractorPaymentResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async findAll(
    @Query() paginatedMonthQueryDto: PaginatedMonthQueryDto,
  ): Promise<SubcontractorPaymentResponseDto[]> {
    return await this.subcontractorPaymentsService.findAll(
      paginatedMonthQueryDto,
    );
  }

  /**
   * Retrieve a subcontractor payment by ID.
   * @param id The subcontractor payment identifier
   * @returns Subcontractor payment with the matching ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a subcontractor payment by ID' })
  @ApiParam({ name: 'id', description: 'Subcontractor payment ID' })
  @ApiOkResponse({
    description: 'The subcontractor payment with the matching ID.',
    type: SubcontractorPaymentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Subcontractor payment not found' })
  async findOne(
    @Param('id') id: string,
  ): Promise<SubcontractorPaymentResponseDto> {
    return await this.subcontractorPaymentsService.findOne(id);
  }

  /**
   * Update a subcontractor payment by ID.
   * @param id The subcontractor payment identifier
   * @param updateSubcontractorPaymentDto Payload with updated subcontractor payment properties
   * @returns The updated subcontractor payment
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a subcontractor payment' })
  @ApiParam({ name: 'id', description: 'Subcontractor payment ID' })
  @ApiOkResponse({
    description: 'The subcontractor payment has been successfully updated.',
    type: SubcontractorPaymentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Subcontractor payment not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Subcontractor payment conflict' })
  async update(
    @Param('id') id: string,
    @Body() updateSubcontractorPaymentDto: UpdateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    return await this.subcontractorPaymentsService.update(
      id,
      updateSubcontractorPaymentDto,
    );
  }

  /**
   * Delete a subcontractor payment by ID.
   * @param id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subcontractor payment by ID' })
  @ApiParam({ name: 'id', description: 'Subcontractor payment ID' })
  @ApiNoContentResponse({
    description: 'The subcontractor payment has been successfully deleted.',
  })
  @ApiNotFoundResponse({ description: 'Subcontractor payment not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.subcontractorPaymentsService.remove(id);
  }
}
