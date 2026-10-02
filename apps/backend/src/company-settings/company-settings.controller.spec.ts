import { Test, TestingModule } from '@nestjs/testing';
import { CompanySettingsController } from './company-settings.controller';
import { CompanySettingsService } from './company-settings.service';
import { UpsertCompanySettingsDto } from './dto/upsert-company-settings.dto';
import { CompanySettingsResponseDto } from './dto/company-settings-response.dto';

describe('CompanySettingsController', () => {
  let controller: CompanySettingsController;

  const mockCompanySettingsService = {
    findOne: jest.fn(),
    upsert: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanySettingsController],
      providers: [
        {
          provide: CompanySettingsService,
          useValue: mockCompanySettingsService,
        },
      ],
    }).compile();

    controller = module.get<CompanySettingsController>(
      CompanySettingsController,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findOne', () => {
    it('should return null when not configured yet', async () => {
      mockCompanySettingsService.findOne.mockResolvedValue(null);

      const result = await controller.findOne();

      expect(result).toBeNull();
    });

    it('should return the settings when configured', async () => {
      const expectedResult: CompanySettingsResponseDto = {
        id: 'company-settings',
        name: 'Acme Construction Ltd.',
        description: 'General contractor',
        companyNumber: '515123456',
        phone: null,
        email: null,
        addressStreet: null,
        addressCity: null,
        logo: null,
        signature: null,
        pdfPrimaryColor: '#1f2a44',
        pdfSecondaryColor: '#c9a24b',
        pdfFont: 'noto-sans-hebrew',
        updatedAt: '2026-07-31T10:39:08.000Z',
      };
      mockCompanySettingsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne();

      expect(result).toEqual(expectedResult);
    });

    it('should propagate errors from the service', async () => {
      mockCompanySettingsService.findOne.mockRejectedValue(
        new Error('Service failure'),
      );

      await expect(controller.findOne()).rejects.toThrow('Service failure');
    });
  });

  describe('upsert', () => {
    it('should forward the body to the service and return its result', async () => {
      const dto: UpsertCompanySettingsDto = {
        name: 'Acme Construction Ltd.',
        companyNumber: '515123456',
      };
      const expectedResult: CompanySettingsResponseDto = {
        id: 'company-settings',
        name: 'Acme Construction Ltd.',
        description: null,
        companyNumber: '515123456',
        phone: null,
        email: null,
        addressStreet: null,
        addressCity: null,
        logo: null,
        signature: null,
        pdfPrimaryColor: '#1f2a44',
        pdfSecondaryColor: '#c9a24b',
        pdfFont: 'noto-sans-hebrew',
        updatedAt: '2026-07-31T10:39:08.000Z',
      };
      mockCompanySettingsService.upsert.mockResolvedValue(expectedResult);

      const result = await controller.upsert(dto);

      expect(result).toEqual(expectedResult);
      expect(mockCompanySettingsService.upsert).toHaveBeenCalledWith(dto);
    });

    it('should propagate errors from the service', async () => {
      mockCompanySettingsService.upsert.mockRejectedValue(
        new Error('Invalid input data'),
      );

      await expect(controller.upsert({})).rejects.toThrow('Invalid input data');
    });
  });
});
