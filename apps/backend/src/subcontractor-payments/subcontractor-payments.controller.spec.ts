import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorPaymentsController } from './subcontractor-payments.controller';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { SubcontractorPaymentNotFoundError } from './errors/subcontractor-payment-not-found.error';

describe('SubcontractorPaymentsController', () => {
  let controller: SubcontractorPaymentsController;

  const mockSubcontractorPaymentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubcontractorPaymentsController],
      providers: [
        {
          provide: SubcontractorPaymentsService,
          useValue: mockSubcontractorPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<SubcontractorPaymentsController>(
      SubcontractorPaymentsController,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a subcontractor payment', async () => {
      const createDto = {
        subcontractorId: '1',
        serviceDate: '2024-06',
        paymentDate: '2024-06-01',
      };
      const expectedResult = {
        id: '1',
        subcontractorId: 'sub1',
        serviceDate: '2024-06',
        paymentDate: '2024-06-01',
      };

      mockSubcontractorPaymentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorPaymentsService.create).toHaveBeenCalledWith(
        createDto,
      );
    });

    it('should throw if subcontractor payment creation fails', async () => {
      const createDto = {
        subcontractorId: '1',
        serviceDate: '2024-06',
        paymentDate: '2024-06-01',
      };

      mockSubcontractorPaymentsService.create.mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(controller.create(createDto)).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('findAll', () => {
    it('should return all subcontractor payments', async () => {
      const expectedResult = [
        {
          id: '1',
          subcontractorId: 'sub1',
          serviceDate: '2024-06',
          paymentDate: '2024-06-01',
        },
        {
          id: '2',
          subcontractorId: 'sub2',
          serviceDate: '2024-05',
          paymentDate: '2024-05-01',
        },
      ];

      mockSubcontractorPaymentsService.findAll.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findAll({ month: '2024-06' });

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorPaymentsService.findAll).toHaveBeenCalledWith({
        month: '2024-06',
      });
    });
  });

  describe('findOne', () => {
    it('should return a subcontractor payment by id', async () => {
      const expectedResult = {
        id: '1',
        subcontractorId: 'sub1',
        serviceDate: '2024-06',
        paymentDate: '2024-06-01',
      };

      mockSubcontractorPaymentsService.findOne.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findOne('1');

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorPaymentsService.findOne).toHaveBeenCalledWith(
        '1',
      );
    });
  });

  describe('update', () => {
    it('should update a subcontractor payment', async () => {
      const updateDto = {
        subcontractorId: '1',
        serviceDate: '2024-06',
        paymentDate: '2024-06-15',
      };
      const expectedResult = {
        id: '1',
        subcontractorId: 'sub1',
        serviceDate: '2024-06',
        paymentDate: '2024-06-15',
      };

      mockSubcontractorPaymentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorPaymentsService.update).toHaveBeenCalledWith(
        '1',
        updateDto,
      );
    });

    it('should throw SubcontractorPaymentNotFoundException if update fails', async () => {
      const updateDto = {
        subcontractorId: '1',
        serviceDate: '2024-06',
        paymentDate: '2024-06-15',
      };

      mockSubcontractorPaymentsService.update.mockRejectedValue(
        new SubcontractorPaymentNotFoundError('1'),
      );

      await expect(controller.update('1', updateDto)).rejects.toThrow(
        SubcontractorPaymentNotFoundError,
      );
    });
  });

  describe('remove', () => {
    it('should remove a subcontractor payment', async () => {
      mockSubcontractorPaymentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('1');

      expect(result).toBeUndefined();
      expect(mockSubcontractorPaymentsService.remove).toHaveBeenCalledWith('1');
    });

    it('should throw SubcontractorPaymentNotFoundException if removal fails', async () => {
      mockSubcontractorPaymentsService.remove.mockRejectedValue(
        new SubcontractorPaymentNotFoundError('1'),
      );

      await expect(controller.remove('1')).rejects.toThrow(
        SubcontractorPaymentNotFoundError,
      );
    });
  });
});
