import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ClientPaymentsService } from './client-payments.service';
import { CreateClientPaymentDto } from './dto/create-client-payment.dto';
import { UpdateClientPaymentDto } from './dto/update-client-payment.dto';
import { ClientPaymentResponseDto } from './dto/client-payment-response.dto';
import { SetVatPaymentDto } from './dto/set-vat-payment.dto';
import { PayInFullDto } from './dto/pay-in-full.dto';

/**
 * What the client paid on the turnover summary (ריכוז מחזורי): partial
 * payments towards a month's income, and that month's VAT marked paid.
 */
@ApiBearerAuth()
@ApiTags('income')
@Controller('income')
export class ClientPaymentsController {
  constructor(private readonly clientPaymentsService: ClientPaymentsService) {}

  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Record a partial payment towards a month's income",
  })
  @ApiCreatedResponse({ type: ClientPaymentResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid input, or the payments would exceed the income',
  })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  create(
    @Body() dto: CreateClientPaymentDto,
  ): Promise<ClientPaymentResponseDto> {
    return this.clientPaymentsService.create(dto);
  }

  @Put('payments/:id')
  @ApiOperation({ summary: "Correct a client payment's amount or date" })
  @ApiParam({ name: 'id', description: 'Client payment ID' })
  @ApiOkResponse({ type: ClientPaymentResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid input, or the payments would exceed the income',
  })
  @ApiNotFoundResponse({ description: 'Client payment not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClientPaymentDto,
  ): Promise<ClientPaymentResponseDto> {
    return this.clientPaymentsService.update(id, dto);
  }

  @Delete('payments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a client payment' })
  @ApiParam({ name: 'id', description: 'Client payment ID' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Client payment not found' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.clientPaymentsService.remove(id);
  }

  @Patch('reports/:id/vat-payment')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark a month's VAT paid on a day, or unpaid" })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async setVatPayment(
    @Param('id') id: string,
    @Body() dto: SetVatPaymentDto,
  ): Promise<void> {
    await this.clientPaymentsService.setVatPayment(id, dto.vatPaidAt);
  }

  @Post('reports/:id/paid-in-full')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Paid in full incl. VAT: record the income still owed and mark the VAT paid, on one day',
  })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async payInFull(
    @Param('id') id: string,
    @Body() dto: PayInFullDto,
  ): Promise<void> {
    await this.clientPaymentsService.payInFull(id, dto.paymentDate);
  }
}
