import { Test, TestingModule } from '@nestjs/testing';
import { CorporationPaymentsController } from './corporation-payments.controller';
import { CorporationPaymentsService } from './corporation-payments.service';
import { CorporationPaymentNotFoundError } from './errors/corporation-payment-not-found.error';
import { CorporationPaymentAlreadyExistsError } from './errors/corporation-payment-already-exists.error';
import { CreateCorporationPaymentDto } from './dto/create-corporation-payment.dto';
import { UpdateCorporationPaymentDto } from './dto/update-corporation-payment.dto';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';

describe('CorporationPaymentsController', () => {
  let controller: CorporationPaymentsController;

  const mockCorporationPaymentsService = {
    create: jest.fn(),
    findCorporationsPaymentsInMonth: jest.fn(),
    findCorporationMonthlyPayments: jest.fn(),
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
      const createDto: CreateCorporationPaymentDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1000,
        date: '2023-01-01T00:00:00.000Z',
        isFuture: false,
      };
      const expectedResult = {
        id: 'payment-1',
        amount: 1000,
        date: '2023-01-01T00:00:00.000Z',
        projectReport: {
          id: 'report-1',
          projectId: 'project-1',
          projectName: 'Project 1',
        },
        corporation: {
          id: 'corp-1',
          name: 'Corp 1',
        },
      };

      mockCorporationPaymentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationPaymentsService.create).toHaveBeenCalledWith(
        createDto,
      );
    });

    it('should propagate errors from the service', async () => {
      const createDto: CreateCorporationPaymentDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1000,
        date: '2023-01-01T00:00:00.000Z',
        isFuture: false,
      };

      mockCorporationPaymentsService.create.mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all corporations payments for a month', async () => {
      const monthQuery: PaginatedMonthQueryDto = {
        month: '2023-01-01T00:00:00.000Z',
        page: 1,
        limit: 10,
      };
      const expectedResult = {
        total: 1500,
        corporationsPayments: [
          {
            corporation: {
              id: 'corp-1',
              name: 'Corp 1',
            },
            projectPayments: [],
            total: 1000,
          },
          {
            corporation: {
              id: 'corp-2',
              name: 'Corp 2',
            },
            projectPayments: [],
            total: 500,
          },
        ],
      };

      mockCorporationPaymentsService.findCorporationsPaymentsInMonth.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findAll(monthQuery);

      expect(result).toEqual(expectedResult);
      expect(
        mockCorporationPaymentsService.findCorporationsPaymentsInMonth,
      ).toHaveBeenCalledWith(monthQuery);
    });
  });

  describe('findOne', () => {
    it("should return a corporation's payments for a given month", async () => {
      const corporationId = 'corp-1';
      const monthQuery: { month: string } = {
        month: '2023-01-01T00:00:00.000Z',
      };
      const expectedResult = {
        corporation: {
          id: corporationId,
          name: 'Corp 1',
        },
        total: 1500,
        projectPayments: [],
      };

      mockCorporationPaymentsService.findCorporationMonthlyPayments.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findOne(corporationId, monthQuery);

      expect(result).toEqual(expectedResult);
      expect(
        mockCorporationPaymentsService.findCorporationMonthlyPayments,
      ).toHaveBeenCalledWith(corporationId, monthQuery);
    });
  });

  describe('update', () => {
    it("should update a corporation's payment", async () => {
      const id = 'payment-1';
      const updateDto: UpdateCorporationPaymentDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1500,
        date: '2023-01-15T00:00:00.000Z',
        isFuture: false,
      };
      const expectedResult = {
        id,
        ...updateDto,
      };

      mockCorporationPaymentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockCorporationPaymentsService.update).toHaveBeenCalledWith(
        id,
        updateDto,
      );
    });

    it('should propagate CorporationPaymentNotFoundError', async () => {
      const id = 'payment-unknown';
      const updateDto: UpdateCorporationPaymentDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1500,
        date: '2023-01-15T00:00:00.000Z',
        isFuture: false,
      };

      mockCorporationPaymentsService.update.mockRejectedValue(
        new CorporationPaymentNotFoundError(id),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        CorporationPaymentNotFoundError,
      );
    });

    it('should propagate CorporationPaymentAlreadyExistsError', async () => {
      const id = 'payment-1';
      const updateDto: UpdateCorporationPaymentDto = {
        corporationId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1500,
        date: '2023-01-15T00:00:00.000Z',
        isFuture: false,
      };

      mockCorporationPaymentsService.update.mockRejectedValue(
        new CorporationPaymentAlreadyExistsError(
          updateDto.corporationId,
          updateDto.date,
        ),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
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
