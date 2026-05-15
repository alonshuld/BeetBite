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
  ApiBearerAuth,
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
import { MonthlySubcontractorPaymentsDto } from './dto/monthly-subcontractor-payments.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';

/**
 * Controller for subcontractor payment-related endpoints.
 * Handles create, read, update, and delete operations.
 * @param subcontractorPaymentsService Service providing subcontractor payment business logic
 */
@ApiBearerAuth()
@ApiTags('subcontractors/payments')
@Controller()
export class SubcontractorPaymentsController {
  constructor(
    private readonly subcontractorPaymentsService: SubcontractorPaymentsService,
  ) {}

  /**
   * Create a new subcontractor payment.
   * @param createSubcontractorPaymentDto CreateSubcontractorPaymentDto containing properties for the new subcontractor payment
   * @returns The created subcontractor payment with its assigned ID and properties
   */
  @Post('/subcontractors/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new subcontractor payment' })
  @ApiCreatedResponse({
    description: 'The subcontractor payment has been successfully created.',
    type: SubcontractorPaymentResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async create(
    @Body() createSubcontractorPaymentDto: CreateSubcontractorPaymentDto,
  ): Promise<SubcontractorPaymentResponseDto> {
    return await this.subcontractorPaymentsService.create(
      createSubcontractorPaymentDto,
    );
  }

  /**
   * Find all subcontractor payments for a given month.
   * @param monthQueryDto MonthQueryDto containing the month to filter payments by
   * @returns List of subcontractor payments for the specified month
   */
  @Get('/subcontractors/payments')
  @ApiOperation({ summary: 'Get all subcontractor payments' })
  @ApiOkResponse({
    description: 'List of subcontractor payments.',
    type: [MonthlySubcontractorPaymentsDto],
  })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async findAll(
    @Query() monthQueryDto: MonthQueryDto,
  ): Promise<MonthlySubcontractorPaymentsDto[]> {
    return await this.subcontractorPaymentsService.findSubcontractorPaymentsInMonth(
      monthQueryDto,
    );
  }

  /**
   * Retrieve all payments for a specific subcontractor in a given month.
   * @param subcontractorId Subcontractor ID to filter payments by
   * @param monthQueryDto MonthQueryDto containing the month to filter payments by (format: YYYY-MM)
   * @returns The subcontractor payments for the specified subcontractor and month
   */
  @Get('/subcontractors/:subcontractorId/payments')
  @ApiOperation({ summary: 'Get a subcontractor payment by ID' })
  @ApiParam({ name: 'subcontractorId', description: 'Subcontractor ID' })
  @ApiOkResponse({
    description: 'The subcontractor payment with the matching ID.',
    type: MonthlySubcontractorPaymentsDto,
  })
  @ApiNotFoundResponse({ description: 'Subcontractor payment not found' })
  async findOne(
    @Param('subcontractorId') subcontractorId: string,
    @Query() monthQueryDto: MonthQueryDto,
  ): Promise<MonthlySubcontractorPaymentsDto> {
    return await this.subcontractorPaymentsService.findSubcontractorMonthlyPayments(
      subcontractorId,
      monthQueryDto,
    );
  }

  /**
   * Update a subcontractor payment by ID.
   * @param id The subcontractor payment identifier
   * @param updateSubcontractorPaymentDto Payload with updated subcontractor payment properties
   * @returns The updated subcontractor payment
   */
  @Put('/subcontractors/payments/:id')
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
   * @param id The subcontractor payment identifier
   */
  @Delete('/subcontractors/payments/:id')
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
