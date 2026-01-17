import { Injectable } from '@nestjs/common';
import { CreateSubcontractorPaymentDto } from './dto/create-subcontractor-payment.dto';
import { UpdateSubcontractorPaymentDto } from './dto/update-subcontractor-payment.dto';

@Injectable()
export class SubcontractorPaymentsService {
  create(createSubcontractorPaymentDto: CreateSubcontractorPaymentDto) {
    return 'This action adds a new subcontractorPayment';
  }

  findAll() {
    return `This action returns all subcontractorPayments`;
  }

  findOne(id: number) {
    return `This action returns a #${id} subcontractorPayment`;
  }

  update(
    id: number,
    updateSubcontractorPaymentDto: UpdateSubcontractorPaymentDto,
  ) {
    return `This action updates a #${id} subcontractorPayment`;
  }

  remove(id: number) {
    return `This action removes a #${id} subcontractorPayment`;
  }
}
