import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';

describe('SubcontractorPaymentsService', () => {
  let service: SubcontractorPaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubcontractorPaymentsService],
    }).compile();

    service = module.get<SubcontractorPaymentsService>(
      SubcontractorPaymentsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
