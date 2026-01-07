import { Test, TestingModule } from '@nestjs/testing';
import { CorporationsController } from './corporations.controller';
import { CorporationsService } from './corporations.service';

describe('CorporationsController', () => {
  let controller: CorporationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorporationsController],
      providers: [CorporationsService],
    }).compile();

    controller = module.get<CorporationsController>(CorporationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
