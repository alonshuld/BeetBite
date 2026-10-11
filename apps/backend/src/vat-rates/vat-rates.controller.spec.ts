import { Test, TestingModule } from '@nestjs/testing';
import { VatRatesController } from './vat-rates.controller';
import { VatRatesService } from './vat-rates.service';
import { VatRateResponseDto } from './dto/vat-rate-response.dto';

describe('VatRatesController', () => {
  let controller: VatRatesController;

  const mockVatRatesService = {
    upsertForMonth: vi.fn(),
    findHistory: vi.fn(),
    resolveForMonth: vi.fn(),
  };

  const mockVatRate: VatRateResponseDto = {
    id: 'vat-rate-1',
    effectiveMonth: '2026-04-01T00:00:00.000Z',
    percentage: 18,
    createdAt: '2026-04-01T09:00:00.000Z',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VatRatesController],
      providers: [{ provide: VatRatesService, useValue: mockVatRatesService }],
    }).compile();

    controller = module.get<VatRatesController>(VatRatesController);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('upsert', () => {
    it('should forward the body to the service and return its result', async () => {
      mockVatRatesService.upsertForMonth.mockResolvedValue(mockVatRate);

      const result = await controller.upsert({
        month: '2026-04-01T00:00:00.000Z',
        percentage: 18,
      });

      expect(result).toEqual(mockVatRate);
      expect(mockVatRatesService.upsertForMonth).toHaveBeenCalledWith({
        month: '2026-04-01T00:00:00.000Z',
        percentage: 18,
      });
    });
  });

  describe('findHistory', () => {
    it('should return the history from the service', async () => {
      mockVatRatesService.findHistory.mockResolvedValue([mockVatRate]);

      const result = await controller.findHistory();

      expect(result).toEqual([mockVatRate]);
    });
  });

  describe('resolve', () => {
    it('should wrap the resolved percentage in a response object', async () => {
      mockVatRatesService.resolveForMonth.mockResolvedValue(18);

      const result = await controller.resolve({
        month: '2026-06-01T00:00:00.000Z',
      });

      expect(result).toEqual({ percentage: 18 });
      expect(mockVatRatesService.resolveForMonth).toHaveBeenCalledWith(
        '2026-06-01T00:00:00.000Z',
      );
    });

    it('should return a null percentage when unresolved', async () => {
      mockVatRatesService.resolveForMonth.mockResolvedValue(null);

      const result = await controller.resolve({
        month: '2026-01-01T00:00:00.000Z',
      });

      expect(result).toEqual({ percentage: null });
    });
  });
});
