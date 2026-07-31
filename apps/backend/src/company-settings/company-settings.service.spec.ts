import { Test, TestingModule } from '@nestjs/testing';
import { CompanySettingsService } from './company-settings.service';
import { UpsertCompanySettingsDto } from './dto/upsert-company-settings.dto';
import { PrismaService } from 'src/prisma/prisma.service';

describe('CompanySettingsService', () => {
  let service: CompanySettingsService;

  const mockPrismaService = {
    companySettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockSettings = {
    id: 'company-settings',
    name: 'Acme Construction Ltd.',
    description: 'General contractor',
    companyNumber: '515123456',
    logo: 'data:image/png;base64,abc',
    signature: 'data:image/png;base64,def',
    updatedAt: new Date('2026-07-31T10:39:08.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanySettingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CompanySettingsService>(CompanySettingsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return null when no settings exist yet', async () => {
      mockPrismaService.companySettings.findUnique.mockResolvedValue(null);

      const result = await service.findOne();

      expect(result).toBeNull();
      expect(mockPrismaService.companySettings.findUnique).toHaveBeenCalledWith(
        { where: { id: 'company-settings' } },
      );
    });

    it('should return the mapped settings when they exist', async () => {
      mockPrismaService.companySettings.findUnique.mockResolvedValue(
        mockSettings,
      );

      const result = await service.findOne();

      expect(result).toEqual({
        id: 'company-settings',
        name: 'Acme Construction Ltd.',
        description: 'General contractor',
        companyNumber: '515123456',
        logo: 'data:image/png;base64,abc',
        signature: 'data:image/png;base64,def',
        updatedAt: '2026-07-31T10:39:08.000Z',
      });
    });
  });

  describe('upsert', () => {
    it('should create/update via a fixed-id upsert', async () => {
      const dto: UpsertCompanySettingsDto = {
        name: 'Acme Construction Ltd.',
        description: 'General contractor',
        companyNumber: '515123456',
      };
      mockPrismaService.companySettings.upsert.mockResolvedValue({
        ...mockSettings,
        logo: null,
        signature: null,
      });

      const result = await service.upsert(dto);

      expect(mockPrismaService.companySettings.upsert).toHaveBeenCalledWith({
        where: { id: 'company-settings' },
        create: { id: 'company-settings', ...dto },
        update: { ...dto },
      });
      expect(result.name).toBe('Acme Construction Ltd.');
    });

    it('should support an empty DTO (skip-onboarding case)', async () => {
      mockPrismaService.companySettings.upsert.mockResolvedValue({
        id: 'company-settings',
        name: null,
        description: null,
        companyNumber: null,
        logo: null,
        signature: null,
        updatedAt: mockSettings.updatedAt,
      });

      const result = await service.upsert({});

      expect(mockPrismaService.companySettings.upsert).toHaveBeenCalledWith({
        where: { id: 'company-settings' },
        create: { id: 'company-settings' },
        update: {},
      });
      expect(result.name).toBeNull();
    });

    it('should pass explicit nulls through (remove-image case)', async () => {
      const dto: UpsertCompanySettingsDto = { logo: null };
      mockPrismaService.companySettings.upsert.mockResolvedValue({
        ...mockSettings,
        logo: null,
      });

      await service.upsert(dto);

      expect(mockPrismaService.companySettings.upsert).toHaveBeenCalledWith({
        where: { id: 'company-settings' },
        create: { id: 'company-settings', logo: null },
        update: { logo: null },
      });
    });
  });
});
