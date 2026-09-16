import { Test, TestingModule } from '@nestjs/testing';
import { SupplierPaymentsController } from './supplier-payments.controller';
import { SupplierPaymentsService } from './supplier-payments.service';
import { SupplierPaymentNotFoundError } from './errors/supplier-payment-not-found.error';
import { SupplierPaymentAlreadyExistsError } from './errors/supplier-payment-already-exists.error';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { UpdateSupplierPaymentDto } from './dto/update-supplier-payment.dto';
import { PaginatedMonthQueryDto } from 'src/common/paginated-month-query.dto';

describe('SupplierPaymentsController', () => {
  let controller: SupplierPaymentsController;

  const mockSupplierPaymentsService = {
    create: jest.fn(),
    findSuppliersPaymentsInMonth: jest.fn(),
    findSupplierMonthlyPayments: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupplierPaymentsController],
      providers: [
        {
          provide: SupplierPaymentsService,
          useValue: mockSupplierPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<SupplierPaymentsController>(
      SupplierPaymentsController,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a supplier payment', async () => {
      const createDto: CreateSupplierPaymentDto = {
        supplierId: 'corp-1',
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
        supplier: {
          id: 'corp-1',
          name: 'Corp 1',
        },
      };

      mockSupplierPaymentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockSupplierPaymentsService.create).toHaveBeenCalledWith(
        createDto,
      );
    });

    it('should propagate errors from the service', async () => {
      const createDto: CreateSupplierPaymentDto = {
        supplierId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1000,
        date: '2023-01-01T00:00:00.000Z',
        isFuture: false,
      };

      mockSupplierPaymentsService.create.mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all suppliers payments for a month', async () => {
      const monthQuery: PaginatedMonthQueryDto = {
        month: '2023-01-01T00:00:00.000Z',
        page: 1,
        limit: 10,
      };
      const expectedResult = {
        total: 1500,
        suppliersPayments: [
          {
            supplier: {
              id: 'corp-1',
              name: 'Corp 1',
            },
            projectPayments: [],
            total: 1000,
          },
          {
            supplier: {
              id: 'corp-2',
              name: 'Corp 2',
            },
            projectPayments: [],
            total: 500,
          },
        ],
      };

      mockSupplierPaymentsService.findSuppliersPaymentsInMonth.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findAll(monthQuery);

      expect(result).toEqual(expectedResult);
      expect(
        mockSupplierPaymentsService.findSuppliersPaymentsInMonth,
      ).toHaveBeenCalledWith(monthQuery);
    });
  });

  describe('findOne', () => {
    it("should return a supplier's payments for a given month", async () => {
      const supplierId = 'corp-1';
      const monthQuery: { month: string } = {
        month: '2023-01-01T00:00:00.000Z',
      };
      const expectedResult = {
        supplier: {
          id: supplierId,
          name: 'Corp 1',
        },
        total: 1500,
        projectPayments: [],
      };

      mockSupplierPaymentsService.findSupplierMonthlyPayments.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findOne(supplierId, monthQuery);

      expect(result).toEqual(expectedResult);
      expect(
        mockSupplierPaymentsService.findSupplierMonthlyPayments,
      ).toHaveBeenCalledWith(supplierId, monthQuery);
    });
  });

  describe('update', () => {
    it("should update a supplier's payment", async () => {
      const id = 'payment-1';
      const updateDto: UpdateSupplierPaymentDto = {
        supplierId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1500,
        date: '2023-01-15T00:00:00.000Z',
        isFuture: false,
      };
      const expectedResult = {
        id,
        ...updateDto,
      };

      mockSupplierPaymentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(id, updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockSupplierPaymentsService.update).toHaveBeenCalledWith(
        id,
        updateDto,
      );
    });

    it('should propagate SupplierPaymentNotFoundError', async () => {
      const id = 'payment-unknown';
      const updateDto: UpdateSupplierPaymentDto = {
        supplierId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1500,
        date: '2023-01-15T00:00:00.000Z',
        isFuture: false,
      };

      mockSupplierPaymentsService.update.mockRejectedValue(
        new SupplierPaymentNotFoundError(id),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        SupplierPaymentNotFoundError,
      );
    });

    it('should propagate SupplierPaymentAlreadyExistsError', async () => {
      const id = 'payment-1';
      const updateDto: UpdateSupplierPaymentDto = {
        supplierId: 'corp-1',
        projectReportId: 'report-1',
        amount: 1500,
        date: '2023-01-15T00:00:00.000Z',
        isFuture: false,
      };

      mockSupplierPaymentsService.update.mockRejectedValue(
        new SupplierPaymentAlreadyExistsError(
          updateDto.supplierId,
          updateDto.date,
        ),
      );

      await expect(controller.update(id, updateDto)).rejects.toThrow(
        SupplierPaymentAlreadyExistsError,
      );
    });
  });

  describe('remove', () => {
    it('should remove a supplier payment', async () => {
      const id = 'payment-1';
      mockSupplierPaymentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(id);

      expect(result).toBeUndefined();
      expect(mockSupplierPaymentsService.remove).toHaveBeenCalledWith(id);
    });

    it('should propagate SupplierPaymentNotFoundError on remove', async () => {
      const id = 'payment-unknown';
      mockSupplierPaymentsService.remove.mockRejectedValue(
        new SupplierPaymentNotFoundError(id),
      );

      await expect(controller.remove(id)).rejects.toThrow(
        SupplierPaymentNotFoundError,
      );
    });
  });
});
