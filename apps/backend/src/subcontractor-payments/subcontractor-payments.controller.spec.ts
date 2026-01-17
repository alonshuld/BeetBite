import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorPaymentsController } from './subcontractor-payments.controller';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';

describe('SubcontractorPaymentsController', () => {
  let controller: SubcontractorPaymentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubcontractorPaymentsController],
      providers: [SubcontractorPaymentsService],
    }).compile();

    controller = module.get<SubcontractorPaymentsController>(
      SubcontractorPaymentsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
