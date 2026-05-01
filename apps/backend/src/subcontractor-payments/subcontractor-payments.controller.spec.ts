import { Test, TestingModule } from '@nestjs/testing';
import { SubcontractorPaymentsController } from './subcontractor-payments.controller';
import { SubcontractorPaymentsService } from './subcontractor-payments.service';
import { SubcontractorPaymentNotFoundError } from './errors/subcontractor-payment-not-found.error';
import { SubcontractorNotFoundError } from 'src/subcontractors/errors/subcontractor-not-found';

describe('SubcontractorPaymentsController', () => {
  let controller: SubcontractorPaymentsController;

  const mockSubcontractorPaymentsService = {
    create: jest.fn(),
    findSubcontractorPaymentsInMonth: jest.fn(),
    findSubcontractorMonthlyPayments: jest.fn(),
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
        serviceDate: '2024-06-01',
        paymentDate: '2024-06-15',
        amount: 1000,
      };
      const expectedResult = {
        id: '1',
        subcontractor: { id: 'sub1', name: 'Test Sub' },
        serviceDate: '2024-06-01T00:00:00.000Z',
        paymentDate: '2024-06-15T00:00:00.000Z',
        amount: 1000,
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
        serviceDate: '2024-06-01',
        paymentDate: '2024-06-15',
        amount: 1000,
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
    it('should return all subcontractor payments for a month', async () => {
      const expectedResult = [
        {
          subcontractor: { id: '1', name: 'Sub 1' },
          payments: [
            {
              id: 'p1',
              serviceDate: '2024-06-01T00:00:00.000Z',
              paymentDate: '2024-06-15T00:00:00.000Z',
              amount: 1000,
            },
          ],
          total: 1000,
          expectedTotal: 1500,
        },
      ];

      mockSubcontractorPaymentsService.findSubcontractorPaymentsInMonth.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findAll({ month: '2024-06' });

      expect(result).toEqual(expectedResult);
      expect(
        mockSubcontractorPaymentsService.findSubcontractorPaymentsInMonth,
      ).toHaveBeenCalledWith({ month: '2024-06' });
    });
  });

  describe('findOne', () => {
    it('should return a subcontractor payment by id', async () => {
      const expectedResult = {
        subcontractor: { id: '1', name: 'Sub 1' },
        payments: [
          {
            id: 'p1',
            serviceDate: '2024-06-01T00:00:00.000Z',
            paymentDate: '2024-06-15T00:00:00.000Z',
            amount: 1000,
          },
        ],
        total: 1000,
        expectedTotal: 1500,
      };

      mockSubcontractorPaymentsService.findSubcontractorMonthlyPayments.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.findOne('1', { month: '2024-06' });

      expect(result).toEqual(expectedResult);
      expect(
        mockSubcontractorPaymentsService.findSubcontractorMonthlyPayments,
      ).toHaveBeenCalledWith('1', { month: '2024-06' });
    });
  });

  describe('update', () => {
    it('should update a subcontractor payment', async () => {
      const updateDto = {
        subcontractorId: '1',
        serviceDate: '2024-06-01',
        paymentDate: '2024-06-15',
        amount: 1500,
      };
      const expectedResult = {
        id: '1',
        subcontractor: { id: 'sub1', name: 'Test Sub' },
        serviceDate: '2024-06-01T00:00:00.000Z',
        paymentDate: '2024-06-15T00:00:00.000Z',
        amount: 1500,
      };

      mockSubcontractorPaymentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update('1', updateDto);

      expect(result).toEqual(expectedResult);
      expect(mockSubcontractorPaymentsService.update).toHaveBeenCalledWith(
        '1',
        updateDto,
      );
    });

    it('should throw SubcontractorPaymentNotFoundError if update fails', async () => {
      const updateDto = {
        subcontractorId: '1',
        serviceDate: '2024-06-01',
        paymentDate: '2024-06-15',
        amount: 1500,
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

    it('should throw SubcontractorPaymentNotFoundError if removal fails', async () => {
      mockSubcontractorPaymentsService.remove.mockRejectedValue(
        new SubcontractorPaymentNotFoundError('1'),
      );

      await expect(controller.remove('1')).rejects.toThrow(
        SubcontractorPaymentNotFoundError,
      );
    });
  });

  describe('Integration Tests with Subcontractor Workflows', () => {
    let integrationController: SubcontractorPaymentsController;
    const integrationMockSubcontractorPaymentsService = {
      create: jest.fn(),
      findSubcontractorPaymentsInMonth: jest.fn(),
      findSubcontractorMonthlyPayments: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    beforeEach(async () => {
      const integrationModule: TestingModule = await Test.createTestingModule({
        controllers: [SubcontractorPaymentsController],
        providers: [
          {
            provide: SubcontractorPaymentsService,
            useValue: integrationMockSubcontractorPaymentsService,
          },
        ],
      }).compile();

      integrationController =
        integrationModule.get<SubcontractorPaymentsController>(
          SubcontractorPaymentsController,
        );

      jest.clearAllMocks();
    });

    describe('subcontractor payment creation workflows', () => {
      const createDto = {
        subcontractorId: 'sub-123',
        serviceDate: '2023-01-01',
        paymentDate: '2023-01-15',
        amount: 1000,
      };

      it('should successfully create a payment for existing subcontractor', async () => {
        const expectedPayment = {
          id: 'payment-123',
          subcontractor: { id: 'sub-123', name: 'Test Sub' },
          serviceDate: '2023-01-01T00:00:00.000Z',
          paymentDate: '2023-01-15T00:00:00.000Z',
          amount: 1000,
        };

        integrationMockSubcontractorPaymentsService.create.mockResolvedValue(
          expectedPayment,
        );

        const result = await integrationController.create(createDto);

        expect(result).toEqual(expectedPayment);
        expect(
          integrationMockSubcontractorPaymentsService.create,
        ).toHaveBeenCalledWith(createDto);
      });

      it('should handle SubcontractorNotFoundError when creating payment for non-existent subcontractor', async () => {
        integrationMockSubcontractorPaymentsService.create.mockRejectedValue(
          new SubcontractorNotFoundError('sub-999'),
        );

        await expect(integrationController.create(createDto)).rejects.toThrow(
          SubcontractorNotFoundError,
        );
      });

      it('should handle payment creation for multiple subcontractors', async () => {
        const createDtos = [
          {
            subcontractorId: 'sub-1',
            serviceDate: '2023-01-01',
            paymentDate: '2023-01-15',
            amount: 1000,
          },
          {
            subcontractorId: 'sub-2',
            serviceDate: '2023-01-01',
            paymentDate: '2023-01-20',
            amount: 2000,
          },
        ];

        const expectedPayments = [
          {
            id: 'payment-1',
            subcontractor: { id: 'sub-1', name: 'Sub 1' },
            serviceDate: '2023-01-01T00:00:00.000Z',
            paymentDate: '2023-01-15T00:00:00.000Z',
            amount: 1000,
          },
          {
            id: 'payment-2',
            subcontractor: { id: 'sub-2', name: 'Sub 2' },
            serviceDate: '2023-01-01T00:00:00.000Z',
            paymentDate: '2023-01-20T00:00:00.000Z',
            amount: 2000,
          },
        ];

        integrationMockSubcontractorPaymentsService.create
          .mockResolvedValueOnce(expectedPayments[0])
          .mockResolvedValueOnce(expectedPayments[1]);

        const result1 = await integrationController.create(createDtos[0]);
        const result2 = await integrationController.create(createDtos[1]);

        expect(result1).toEqual(expectedPayments[0]);
        expect(result2).toEqual(expectedPayments[1]);
        expect(
          integrationMockSubcontractorPaymentsService.create,
        ).toHaveBeenCalledTimes(2);
      });
    });

    describe('subcontractor payment retrieval workflows', () => {
      it('should retrieve all payments for a specific month', async () => {
        const expectedPayments = [
          {
            subcontractor: { id: 'sub-1', name: 'Sub 1' },
            payments: [
              {
                id: 'payment-1',
                serviceDate: '2023-01-01T00:00:00.000Z',
                paymentDate: '2023-01-15T00:00:00.000Z',
                amount: 1000,
              },
            ],
            total: 1000,
            expectedTotal: 1500,
          },
        ];

        integrationMockSubcontractorPaymentsService.findSubcontractorPaymentsInMonth.mockResolvedValue(
          expectedPayments,
        );

        const result = await integrationController.findAll({
          month: '2023-01',
        });

        expect(result).toEqual(expectedPayments);
        expect(
          integrationMockSubcontractorPaymentsService.findSubcontractorPaymentsInMonth,
        ).toHaveBeenCalledWith({ month: '2023-01' });
      });

      it('should return empty array when no payments found for month', async () => {
        integrationMockSubcontractorPaymentsService.findSubcontractorPaymentsInMonth.mockResolvedValue(
          [],
        );

        const result = await integrationController.findAll({
          month: '2023-12',
        });

        expect(result).toEqual([]);
      });

      it('should retrieve specific payment by ID', async () => {
        const expectedPayment = {
          subcontractor: { id: 'sub-123', name: 'Test Sub' },
          payments: [
            {
              id: 'payment-123',
              serviceDate: '2023-01-01T00:00:00.000Z',
              paymentDate: '2023-01-15T00:00:00.000Z',
              amount: 1000,
            },
          ],
          total: 1000,
          expectedTotal: 1500,
        };

        integrationMockSubcontractorPaymentsService.findSubcontractorMonthlyPayments.mockResolvedValue(
          expectedPayment,
        );

        const result = await integrationController.findOne('sub-123', {
          month: '2023-01',
        });

        expect(result).toEqual(expectedPayment);
        expect(
          integrationMockSubcontractorPaymentsService.findSubcontractorMonthlyPayments,
        ).toHaveBeenCalledWith('sub-123', { month: '2023-01' });
      });

      it('should handle SubcontractorNotFoundError when subcontractor not found', async () => {
        integrationMockSubcontractorPaymentsService.findSubcontractorMonthlyPayments.mockRejectedValue(
          new SubcontractorNotFoundError('sub-999'),
        );

        await expect(
          integrationController.findOne('sub-999', { month: '2023-01' }),
        ).rejects.toThrow(SubcontractorNotFoundError);
      });
    });

    describe('subcontractor payment update workflows', () => {
      const updateDto = {
        subcontractorId: 'sub-123',
        serviceDate: '2023-01-01',
        paymentDate: '2023-01-20',
        amount: 1500,
      };

      it('should successfully update an existing payment', async () => {
        const expectedUpdatedPayment = {
          id: 'payment-123',
          subcontractor: { id: 'sub-123', name: 'Test Sub' },
          serviceDate: '2023-01-01T00:00:00.000Z',
          paymentDate: '2023-01-20T00:00:00.000Z',
          amount: 1500,
        };

        integrationMockSubcontractorPaymentsService.update.mockResolvedValue(
          expectedUpdatedPayment,
        );

        const result = await integrationController.update(
          'payment-123',
          updateDto,
        );

        expect(result).toEqual(expectedUpdatedPayment);
        expect(
          integrationMockSubcontractorPaymentsService.update,
        ).toHaveBeenCalledWith('payment-123', updateDto);
      });

      it('should handle SubcontractorNotFoundError when updating payment with invalid subcontractor', async () => {
        integrationMockSubcontractorPaymentsService.update.mockRejectedValue(
          new SubcontractorNotFoundError('sub-999'),
        );

        await expect(
          integrationController.update('payment-123', updateDto),
        ).rejects.toThrow(SubcontractorNotFoundError);
      });

      it('should handle SubcontractorPaymentNotFoundError when updating non-existent payment', async () => {
        integrationMockSubcontractorPaymentsService.update.mockRejectedValue(
          new SubcontractorPaymentNotFoundError('payment-999'),
        );

        await expect(
          integrationController.update('payment-999', updateDto),
        ).rejects.toThrow(SubcontractorPaymentNotFoundError);
      });
    });

    describe('subcontractor payment deletion workflows', () => {
      it('should successfully delete an existing payment', async () => {
        integrationMockSubcontractorPaymentsService.remove.mockResolvedValue(
          undefined,
        );

        await integrationController.remove('payment-123');

        expect(
          integrationMockSubcontractorPaymentsService.remove,
        ).toHaveBeenCalledWith('payment-123');
      });

      it('should handle SubcontractorPaymentNotFoundError when deleting non-existent payment', async () => {
        integrationMockSubcontractorPaymentsService.remove.mockRejectedValue(
          new SubcontractorPaymentNotFoundError('payment-999'),
        );

        await expect(
          integrationController.remove('payment-999'),
        ).rejects.toThrow(SubcontractorPaymentNotFoundError);
      });
    });

    describe('complete subcontractor payment workflow tests', () => {
      it('should handle complete workflow: create, retrieve, update, delete payment', async () => {
        const createDto = {
          subcontractorId: 'sub-workflow',
          serviceDate: '2023-01-01',
          paymentDate: '2023-01-15',
          amount: 1000,
        };

        const createdPayment = {
          id: 'payment-workflow',
          subcontractor: { id: 'sub-workflow', name: 'Workflow Sub' },
          serviceDate: '2023-01-01T00:00:00.000Z',
          paymentDate: '2023-01-15T00:00:00.000Z',
          amount: 1000,
        };

        const updatedPayment = {
          ...createdPayment,
          paymentDate: '2023-01-20T00:00:00.000Z',
          amount: 1500,
        };

        const monthlyPayment = {
          subcontractor: { id: 'sub-workflow', name: 'Workflow Sub' },
          payments: [
            {
              id: 'payment-workflow',
              serviceDate: '2023-01-01T00:00:00.000Z',
              paymentDate: '2023-01-15T00:00:00.000Z',
              amount: 1000,
            },
          ],
          total: 1000,
          expectedTotal: 1500,
        };

        integrationMockSubcontractorPaymentsService.create.mockResolvedValue(
          createdPayment,
        );
        const createResult = await integrationController.create(createDto);
        expect(createResult).toEqual(createdPayment);

        integrationMockSubcontractorPaymentsService.findSubcontractorMonthlyPayments.mockResolvedValue(
          monthlyPayment,
        );
        const findResult = await integrationController.findOne('sub-workflow', {
          month: '2023-01',
        });
        expect(findResult).toEqual(monthlyPayment);

        integrationMockSubcontractorPaymentsService.update.mockResolvedValue(
          updatedPayment,
        );
        const updateDto = {
          subcontractorId: 'sub-workflow',
          serviceDate: '2023-01-01',
          paymentDate: '2023-01-20',
          amount: 1500,
        };
        const updateResult = await integrationController.update(
          'payment-workflow',
          updateDto,
        );
        expect(updateResult).toEqual(updatedPayment);

        integrationMockSubcontractorPaymentsService.remove.mockResolvedValue(
          undefined,
        );
        await integrationController.remove('payment-workflow');

        expect(
          integrationMockSubcontractorPaymentsService.create,
        ).toHaveBeenCalledWith(createDto);
        expect(
          integrationMockSubcontractorPaymentsService.findSubcontractorMonthlyPayments,
        ).toHaveBeenCalledWith('sub-workflow', { month: '2023-01' });
        expect(
          integrationMockSubcontractorPaymentsService.update,
        ).toHaveBeenCalledWith('payment-workflow', updateDto);
        expect(
          integrationMockSubcontractorPaymentsService.remove,
        ).toHaveBeenCalledWith('payment-workflow');
      });
    });
  });
});
