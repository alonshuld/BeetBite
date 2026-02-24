import { Test, TestingModule } from '@nestjs/testing';
import { CorporationPaymentsController } from './corporation-payments.controller';
import { CorporationPaymentsService } from './corporation-payments.service';
import { CorporationPaymentNotFoundError } from './errors/corporation-payment-not-found.dto';
import { CorporationPaymentAlreadyExistsError } from './errors/corporation-payment-already-exists.dto';

describe('CorporationPaymentsController', () => {
  let controller: CorporationPaymentsController;

  const mockCorporationPaymentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorporationPaymentsController],
      providers: [
        {
          provide: CorporationPaymentsService,
          useValue: mockCorporationPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<CorporationPaymentsController>(
      CorporationPaymentsController,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a corporation payment', async () => {
      const createDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1000,
        date: '2023-01-01',
      };
      const expectedResult = {
        id: 'payment-1',
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1000,
        date: '2023-01-01',
      };

      mockCorporationPaymentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto as any);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationPaymentsService.create).toHaveBeenCalledWith(
        createDto,
      );
    });

    it('should propagate errors from the service', async () => {
      const createDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1000,
        date: '2023-01-01',
      };

      mockCorporationPaymentsService.create.mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(controller.create(createDto as any)).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all corporations payments for a month', async () => {
      const monthQuery = { month: '2023-01-01' };
      const expectedResult = {
        total: 1500,
        corporationsPayments: [
          {
            id: 'corp-1',
            total: 1000,
          },
          {
            id: 'corp-2',
            total: 500,
          },
        ],
      };

      mockCorporationPaymentsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(monthQuery as any);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationPaymentsService.findAll).toHaveBeenCalledWith(
        monthQuery,
      );
    });
  });

  describe('findOne', () => {
    it("should return a corporation's payments for a given month", async () => {
      const corporationId = 'corp-1';
      const monthQuery = { month: '2023-01-01' };
      const expectedResult = {
        id: corporationId,
        total: 1500,
        projectPayments: [],
      };

      mockCorporationPaymentsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(
        corporationId,
        monthQuery as any,
      );

      expect(result).toEqual(expectedResult);
      expect(mockCorporationPaymentsService.findOne).toHaveBeenCalledWith(
        corporationId,
        monthQuery,
      );
    });
  });

  describe('update', () => {
    it("should update a corporation's payment", async () => {
      const id = 'payment-1';
      const updateDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1500,
        date: '2023-01-15',
      };
      const expectedResult = {
        id,
        ...updateDto,
      };

      mockCorporationPaymentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, updateDto as any);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationPaymentsService.update).toHaveBeenCalledWith(
        id,
        updateDto,
      );
    });

    it('should propagate CorporationPaymentNotFoundError', async () => {
      const id = 'payment-unknown';
      const updateDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1500,
        date: '2023-01-15',
      };

      mockCorporationPaymentsService.update.mockRejectedValue(
        new CorporationPaymentNotFoundError(id),
      );

      await expect(controller.update(id, updateDto as any)).rejects.toThrow(
        CorporationPaymentNotFoundError,
      );
    });

    it('should propagate CorporationPaymentAlreadyExistsError', async () => {
      const id = 'payment-1';
      const updateDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1500,
        date: '2023-01-15',
      };

      mockCorporationPaymentsService.update.mockRejectedValue(
        new CorporationPaymentAlreadyExistsError(
          updateDto.corporationId,
          updateDto.date as any,
        ),
      );

      await expect(controller.update(id, updateDto as any)).rejects.toThrow(
        CorporationPaymentAlreadyExistsError,
      );
    });
  });

  describe('remove', () => {
    it('should remove a corporation payment', async () => {
      const id = 'payment-1';
      mockCorporationPaymentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(id);

      expect(result).toBeUndefined();
      expect(mockCorporationPaymentsService.remove).toHaveBeenCalledWith(id);
    });

    it('should propagate CorporationPaymentNotFoundError on remove', async () => {
      const id = 'payment-unknown';
      mockCorporationPaymentsService.remove.mockRejectedValue(
        new CorporationPaymentNotFoundError(id),
      );

      await expect(controller.remove(id)).rejects.toThrow(
        CorporationPaymentNotFoundError,
      );
    });
  });
});
