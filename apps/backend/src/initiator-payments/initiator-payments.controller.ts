import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
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
import { InitiatorPaymentsService } from './initiator-payments.service';
import { InitiatorPaymentResponseDto } from './dto/initiator-payment-response.dto';
import { CreateInitiatorPaymentDto } from './dto/create-initiator-payment.dto';
import { UpdateInitiatorPaymentDto } from './dto/update-initiator-payment.dto';

@ApiBearerAuth()
@ApiTags('initiators/payments')
@Controller()
export class InitiatorPaymentsController {
  constructor(
    private readonly initiatorPaymentsService: InitiatorPaymentsService,
  ) {}

  @Post('/initiators/payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new initiator payment' })
  @ApiCreatedResponse({
    description: 'The initiator payment has been successfully created.',
    type: InitiatorPaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data for creating initiator payment.',
  })
  @ApiConflictResponse({
    description: 'Conflict occurred while creating initiator payment.',
  })
  async create(
    @Body() createInitiatorPaymentDto: CreateInitiatorPaymentDto,
  ): Promise<InitiatorPaymentResponseDto> {
    return await this.initiatorPaymentsService.create(
      createInitiatorPaymentDto,
    );
  }

  @Put('/initiators/payments/:id')
  @ApiOperation({ summary: 'Update an initiator payment' })
  @ApiParam({ name: 'id', description: 'Initiator payment ID' })
  @ApiOkResponse({
    description: 'The updated initiator payment.',
    type: InitiatorPaymentResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Initiator payment not found' })
  @ApiBadRequestResponse({
    description: 'Invalid input data for updating initiator payment.',
  })
  async update(
    @Param('id') id: string,
    @Body() updateInitiatorPaymentDto: UpdateInitiatorPaymentDto,
  ): Promise<InitiatorPaymentResponseDto> {
    return await this.initiatorPaymentsService.update(
      id,
      updateInitiatorPaymentDto,
    );
  }

  @Delete('/initiators/payments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an initiator payment by ID' })
  @ApiParam({ name: 'id', description: 'Initiator payment ID' })
  @ApiNotFoundResponse({ description: 'Initiator payment not found' })
  @ApiNoContentResponse({
    description: 'The initiator payment has been successfully deleted.',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.initiatorPaymentsService.remove(id);
  }
}
