import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
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
import { SupplierPaymentsService } from './supplier-payments.service';
import { SupplierPaymentResponseDto } from './dto/supplier-payment-response.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { MonthlySupplierPaymentsResponseDto } from './dto/monthly-supplier-payments-response.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { MultipleMonthlySupplierPaymentsResponseDto } from './dto/multiple-monthly-supplier-payments-response.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { BatchCreateSupplierPaymentsDto } from './dto/batch-create-supplier-payments.dto';
import { SetSupplierPaymentPaidDto } from './dto/set-supplier-payment-paid.dto';
import { SetSupplierPaymentVatDto } from './dto/set-supplier-payment-vat.dto';
import { SetSupplierPaymentsPaidDto } from './dto/set-supplier-payments-paid.dto';

@ApiTags('suppliers/payments')
@Controller()
export class SupplierPaymentsController {
  constructor(
    private readonly supplierPaymentsService: SupplierPaymentsService,
  ) {}

  /**
   * Create a new supplier payment.
   * @param createSupplierPaymentDto Payload with supplier payment properties
   * @returns The created supplier payment
   */
  @Post('/suppliers/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new supplier payment' })
  @ApiCreatedResponse({
    description: 'The supplier payment has been successfully created.',
    type: SupplierPaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for creating supplier payment.',
  })
  @ApiConflictResponse({
    description: 'Conflict occurred while creating supplier payment.',
  })
  async create(
    @Body() createSupplierPaymentDto: CreateSupplierPaymentDto,
  ): Promise<SupplierPaymentResponseDto> {
    return await this.supplierPaymentsService.create(createSupplierPaymentDto);
  }

  /**
   * Get all supplier payments for a given month.
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns List of supplier payments for the specified month
   */
  @Get('/suppliers/payments')
  @ApiOperation({ summary: 'Get all supplier payments for a given month' })
  @ApiOkResponse({
    description: 'List of supplier payments for the specified month.',
    type: MultipleMonthlySupplierPaymentsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for pagination or date filtering.',
  })
  async findAll(
    @Query() monthQueryDto: MonthQueryDto,
  ): Promise<MultipleMonthlySupplierPaymentsResponseDto> {
    return await this.supplierPaymentsService.findSuppliersPaymentsInMonth(
      monthQueryDto,
    );
  }

  /**
   * Get a supplier's payments for a given month.
   * @param supplierId Supplier ID
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns Supplier payments for the specified month
   */
  @Get('/suppliers/:supplierId/payments')
  @ApiOperation({ summary: "Get a supplier's payments for a given month" })
  @ApiParam({ name: 'supplierId', description: 'Supplier ID' })
  @ApiOkResponse({
    description: "Supplier's payments for the specified month.",
    type: MonthlySupplierPaymentsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for date filtering.',
  })
  @ApiNotFoundResponse({
    description: 'Supplier not found or no payments for the specified month.',
  })
  async findOne(
    @Param('supplierId') supplierId: string,
    @Query() monthQueryDto: MonthQueryDto,
  ): Promise<MonthlySupplierPaymentsResponseDto> {
    return await this.supplierPaymentsService.findSupplierMonthlyPayments(
      supplierId,
      monthQueryDto,
    );
  }

  /**
   * Update a supplier's payment for a given month.
   * @param id Supplier payment ID
   * @param updateSupplierPaymentDto Updated supplier payment DTO
   * @returns The updated supplier payment
   */
  @Put('/suppliers/payments/:id')
  @ApiOperation({ summary: "Update a supplier's payment for a given month" })
  @ApiParam({ name: 'id', description: 'Supplier payment ID' })
  @ApiOkResponse({
    description: 'The updated supplier payment for the specified month.',
    type: SupplierPaymentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Supplier payment not found for the specified month.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for updating supplier payment.',
  })
  @ApiConflictResponse({
    description: 'Conflict occurred while updating supplier payment.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateSupplierPaymentDto: UpdateSupplierPaymentDto,
  ): Promise<SupplierPaymentResponseDto> {
    return await this.supplierPaymentsService.update(
      id,
      updateSupplierPaymentDto,
    );
  }

  /**
   * Delete a supplier payment by ID.
   * @param id The supplier payment identifier
   * @returns No content if the deletion was successful
   */
  @Delete('/suppliers/payments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a supplier payment by ID' })
  @ApiParam({ name: 'id', description: 'Supplier payment ID' })
  @ApiNotFoundResponse({ description: 'Supplier payment not found' })
  @ApiNoContentResponse({
    description: 'The supplier payment has been successfully deleted.',
  })
  async remove(@Param('id') id: string) {
    return await this.supplierPaymentsService.remove(id);
  }

  /**
   * Record a whole stack of one supplier's paperwork in a single submission.
   * All rows are written, or none are.
   * @param supplierId Supplier the paperwork came from
   * @param dto The payment lines
   * @returns The created payments
   */
  @Post('/suppliers/:supplierId/payments/batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Record a batch of one supplier's payments in a single submission",
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier receiving payment' })
  @ApiCreatedResponse({ type: [SupplierPaymentResponseDto] })
  @ApiNotFoundResponse({ description: 'Supplier or project report not found' })
  @ApiBadRequestResponse({ description: 'Invalid rows' })
  async createBatch(
    @Param('supplierId') supplierId: string,
    @Body() dto: BatchCreateSupplierPaymentsDto,
  ): Promise<SupplierPaymentResponseDto[]> {
    return await this.supplierPaymentsService.createBatch(supplierId, dto);
  }

  /**
   * Mark a single supplier payment paid or unpaid.
   * @param id Payment to flag
   * @param dto Whether it is paid
   * @returns The updated payment
   */
  @Patch('/suppliers/payments/:id/paid')
  @ApiOperation({ summary: 'Mark a supplier payment paid or unpaid' })
  @ApiParam({ name: 'id', description: 'Supplier payment to flag' })
  @ApiOkResponse({ type: SupplierPaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Supplier payment not found' })
  async setPaid(
    @Param('id') id: string,
    @Body() dto: SetSupplierPaymentPaidDto,
  ): Promise<SupplierPaymentResponseDto> {
    return await this.supplierPaymentsService.setPaid(id, dto);
  }

  /**
   * Turn VAT on or off for a single supplier payment. The percentage is never
   * supplied — it is the global VAT rate for the payment's report month.
   * @param id Payment to change
   * @param dto Whether the payment carries VAT
   * @returns The updated payment
   */
  @Patch('/suppliers/payments/:id/vat')
  @ApiOperation({ summary: 'Turn VAT on or off for a supplier payment' })
  @ApiParam({ name: 'id', description: 'Supplier payment to change' })
  @ApiOkResponse({ type: SupplierPaymentResponseDto })
  @ApiNotFoundResponse({ description: 'Supplier payment not found' })
  async setIncludesVat(
    @Param('id') id: string,
    @Body() dto: SetSupplierPaymentVatDto,
  ): Promise<SupplierPaymentResponseDto> {
    return await this.supplierPaymentsService.setIncludesVat(id, dto);
  }

  /**
   * Mark every one of a supplier's payments in a month paid or unpaid — a
   * stack of paperwork usually settles as one transfer.
   * @param supplierId Supplier whose payments to settle
   * @param dto Whether they are paid, and which month
   * @returns How many payments were changed
   */
  @Patch('/suppliers/:supplierId/payments/paid')
  @ApiOperation({
    summary: "Mark all of a supplier's payments in a month paid or unpaid",
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier to settle' })
  @ApiOkResponse({ description: 'Number of payments changed' })
  @ApiNotFoundResponse({ description: 'Supplier not found' })
  async setPaidForSupplier(
    @Param('supplierId') supplierId: string,
    @Body() dto: SetSupplierPaymentsPaidDto,
  ): Promise<{ updated: number }> {
    return await this.supplierPaymentsService.setPaidForSupplier(
      supplierId,
      dto,
    );
  }
}
