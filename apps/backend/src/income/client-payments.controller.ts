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
import { SetIncomeVatDto } from './dto/set-income-vat.dto';

/**
 * The client's partial payments towards a month of a project, and that month's
 * VAT choice — the writes behind the turnover summary (ריכוז מחזורי) screen.
 */
@ApiBearerAuth()
@ApiTags('income')
@Controller('income')
export class ClientPaymentsController {
  constructor(private readonly clientPaymentsService: ClientPaymentsService) {}

  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a partial payment from the client' })
  @ApiCreatedResponse({ type: ClientPaymentResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid input, or the payment exceeds the amount owed',
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
    description: 'Invalid input, or the payment exceeds the amount owed',
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

  @Patch('reports/:id/vat')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Set whether the client pays VAT on this month's income",
  })
  @ApiParam({ name: 'id', description: 'Project report ID' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({
    description:
      'Turning VAT off would leave recorded payments above the income',
  })
  @ApiNotFoundResponse({ description: 'Project report not found' })
  async setVat(
    @Param('id') id: string,
    @Body() dto: SetIncomeVatDto,
  ): Promise<void> {
    await this.clientPaymentsService.setIncomeVat(id, dto.incomeIncludesVat);
  }
}
