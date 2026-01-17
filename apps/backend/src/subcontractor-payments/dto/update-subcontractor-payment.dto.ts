import { PartialType } from '@nestjs/swagger';
import { CreateSubcontractorPaymentDto } from './create-subcontractor-payment.dto';

export class UpdateSubcontractorPaymentDto extends PartialType(
  CreateSubcontractorPaymentDto,
) {}
