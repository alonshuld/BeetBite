import { Test, TestingModule } from '@nestjs/testing';
import { VatRatesService } from './vat-rates.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from 'src/generated/client';

describe('VatRatesService', () => {
  let service: VatRatesService;

  const mockPrismaService = {
    vatRate: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockVatRate = {
    id: 'vat-rate-1',
    effectiveMonth: new Date('2026-04-01T00:00:00.000Z'),
    percentage: new Prisma.Decimal(18),
    createdAt: new Date('2026-04-01T09:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VatRatesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<VatRatesService>(VatRatesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsertForMonth', () => {
    it('should upsert on the normalized effective month', async () => {
      mockPrismaService.vatRate.upsert.mockResolvedValue(mockVatRate);

      const result = await service.upsertForMonth({
        month: '2026-04-01T00:00:00.000Z',
        percentage: 18,
      });

      expect(mockPrismaService.vatRate.upsert).toHaveBeenCalledWith({
        where: { effectiveMonth: new Date('2026-04-01T00:00:00.000Z') },
        create: {
          effectiveMonth: new Date('2026-04-01T00:00:00.000Z'),
          percentage: new Prisma.Decimal(18),
        },
        update: { percentage: new Prisma.Decimal(18) },
      });
      expect(result.percentage).toBe(18);
    });
  });

  describe('findHistory', () => {
    it('should return the history ordered most-recent-first', async () => {
      mockPrismaService.vatRate.findMany.mockResolvedValue([mockVatRate]);

      const result = await service.findHistory();

      expect(mockPrismaService.vatRate.findMany).toHaveBeenCalledWith({
        orderBy: { effectiveMonth: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(18);
    });
  });

  describe('resolveForMonth', () => {
    it('should return null when no rate has ever been configured', async () => {
      mockPrismaService.vatRate.findFirst.mockResolvedValue(null);

      const result = await service.resolveForMonth('2026-01-15');

      expect(result).toBeNull();
    });

    it('should carry forward a rate to later months until overridden', async () => {
      // A rate set for April should resolve for May/June too — most recent
      // effectiveMonth <= the queried month.
      mockPrismaService.vatRate.findFirst.mockResolvedValue(mockVatRate);

      const result = await service.resolveForMonth('2026-06-10');

      expect(mockPrismaService.vatRate.findFirst).toHaveBeenCalledWith({
        where: {
          effectiveMonth: { lte: new Date('2026-06-01T00:00:00.000Z') },
        },
        orderBy: { effectiveMonth: 'desc' },
      });
      expect(result).toBe(18);
    });

    it("should not let a later month's rate affect an earlier month's resolution", async () => {
      // Simulates: April=18%, July=20%. Resolving May must only ever query
      // for effectiveMonth <= May, so a later July override cannot leak backward.
      mockPrismaService.vatRate.findFirst.mockResolvedValue(mockVatRate);

      await service.resolveForMonth('2026-05-01');

      expect(mockPrismaService.vatRate.findFirst).toHaveBeenCalledWith({
        where: {
          effectiveMonth: { lte: new Date('2026-05-01T00:00:00.000Z') },
        },
        orderBy: { effectiveMonth: 'desc' },
      });
    });
  });
});
