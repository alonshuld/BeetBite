import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { CorporationPaymentsService } from './corporation-payments.service';
import { CorporationPaymentResponseDto } from './dto/corporation-payment-response.dto';
import { CreateCorporationPaymentDto } from './dto/create-corporation-payment.dto';
import { MonthlyCorporationPaymentsResponseDto } from './dto/monthly-corporation-payments-response.dto';
import { MonthQueryDto } from 'src/common/month-query.dto';
import { MultipleMonthlyCorporationPaymentsResponseDto } from './dto/multiple-monthly-corporation-payments-response.dto';
import { UpdateCorporationPaymentDto } from './dto/update-corporation-payment.dto';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';

@ApiTags('corporations/payments')
@Controller()
export class CorporationPaymentsController {
  constructor(
    private readonly corporationPaymentsService: CorporationPaymentsService,
  ) {}

  /**
   * Create a new corporation payment.
   * @param createCorporationPaymentDto Payload with corporation payment properties
   * @returns The created corporation payment
   */
  @Post('/corporations/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new corporation payment' })
  @ApiCreatedResponse({
    description: 'The corporation payment has been successfully created.',
    type: CorporationPaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for creating corporation payment.',
  })
  @ApiConflictResponse({
    description: 'Conflict occurred while creating corporation payment.',
  })
  async create(
    @Body() createCorporationPaymentDto: CreateCorporationPaymentDto,
  ): Promise<CorporationPaymentResponseDto> {
    return await this.corporationPaymentsService.create(
      createCorporationPaymentDto,
    );
  }

  /**
   * Get all corporation payments for a given month.
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns List of corporation payments for the specified month
   */
  @Get('/corporations/payments')
  @ApiOperation({ summary: 'Get all corporation payments for a given month' })
  @ApiOkResponse({
    description: 'List of corporation payments for the specified month.',
    type: MultipleMonthlyCorporationPaymentsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for pagination or date filtering.',
  })
  async findAll(
    @Query() paginatedMonthQueryDto: PaginatedMonthQueryDto,
  ): Promise<MultipleMonthlyCorporationPaymentsResponseDto> {
    return await this.corporationPaymentsService.findCorporationPaymentsInMonth(
      paginatedMonthQueryDto,
    );
  }

  /**
   * Get a corporation's payments for a given month.
   * @param corporationId Corporation ID
   * @param monthQueryDto Month query DTO containing the month to filter payments by
   * @returns Corporation payments for the specified month
   */
  @Get('/corporations/:corporationId/payments')
  @ApiOperation({ summary: "Get a corporation's payments for a given month" })
  @ApiParam({ name: 'corporationId', description: 'Corporation ID' })
  @ApiOkResponse({
    description: "Corporation's payments for the specified month.",
    type: MonthlyCorporationPaymentsResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for date filtering.',
  })
  @ApiNotFoundResponse({
    description:
      'Corporation not found or no payments for the specified month.',
  })
  async findOne(
    @Param('corporationId') corporationId: string,
    @Query() monthQueryDto: MonthQueryDto,
  ): Promise<MonthlyCorporationPaymentsResponseDto | null> {
    return await this.corporationPaymentsService.findOne(
      corporationId,
      monthQueryDto,
    );
  }

  /**
   * Update a corporation's payment for a given month.
   * @param id Corporation payment ID
   * @param updateCorporationPaymentDto Updated corporation payment DTO
   * @returns The updated corporation payment
   */
  @Put('/corporations/payments/:id')
  @ApiOperation({ summary: "Update a corporation's payment for a given month" })
  @ApiParam({ name: 'id', description: 'Corporation payment ID' })
  @ApiOkResponse({
    description: 'The updated corporation payment for the specified month.',
    type: CorporationPaymentResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Corporation payment not found for the specified month.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for updating corporation payment.',
  })
  @ApiConflictResponse({
    description: 'Conflict occurred while updating corporation payment.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCorporationPaymentDto: UpdateCorporationPaymentDto,
  ): Promise<CorporationPaymentResponseDto> {
    return await this.corporationPaymentsService.update(
      id,
      updateCorporationPaymentDto,
    );
  }

  /**
   * Delete a corporation payment by ID.
   * @param id The corporation payment identifier
   * @returns No content if the deletion was successful
   */
  @Delete('/corporations/payments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a corporation payment by ID' })
  @ApiParam({ name: 'id', description: 'Corporation payment ID' })
  @ApiNotFoundResponse({ description: 'Corporation payment not found' })
  @ApiNoContentResponse({
    description: 'The corporation payment has been successfully deleted.',
  })
  async remove(@Param('id') id: string) {
    return await this.corporationPaymentsService.remove(id);
  }
}
