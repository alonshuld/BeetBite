import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { UpdateSubcontractorPaymentDto } from './dto/update-subcontractor-payment.dto';

@Controller('subcontractor-payments')
export class SubcontractorPaymentsController {
  constructor(
    private readonly subcontractorPaymentsService: SubcontractorPaymentsService,
  ) {}

  @Post()
  create(@Body() createSubcontractorPaymentDto: CreateSubcontractorPaymentDto) {
    return this.subcontractorPaymentsService.create(
      createSubcontractorPaymentDto,
    );
  }

  @Get()
  findAll() {
    return this.subcontractorPaymentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subcontractorPaymentsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubcontractorPaymentDto: UpdateSubcontractorPaymentDto,
  ) {
    return this.subcontractorPaymentsService.update(
      +id,
      updateSubcontractorPaymentDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subcontractorPaymentsService.remove(+id);
  }
}
