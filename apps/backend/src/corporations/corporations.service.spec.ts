import { Test, TestingModule } from '@nestjs/testing';
import { CorporationsService } from './corporations.service';

describe('CorporationsService', () => {
  let service: CorporationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorporationsService],
    }).compile();

    service = module.get<CorporationsService>(CorporationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
