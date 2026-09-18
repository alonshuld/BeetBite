import { Test, TestingModule } from '@nestjs/testing';
import { InitiatorPaymentsController } from './initiator-payments.controller';
import { InitiatorPaymentsService } from './initiator-payments.service';
import { CreateInitiatorPaymentDto } from './dto/create-initiator-payment.dto';
import { UpdateInitiatorPaymentDto } from './dto/update-initiator-payment.dto';
import { InitiatorPaymentResponseDto } from './dto/initiator-payment-response.dto';
import { InitiatorPaymentNotFoundError } from './errors/initiator-payment-not-found.error';

describe('InitiatorPaymentsController', () => {
  let controller: InitiatorPaymentsController;

  const mockInitiatorPaymentsService = {
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InitiatorPaymentsController],
      providers: [
        {
          provide: InitiatorPaymentsService,
          useValue: mockInitiatorPaymentsService,
        },
      ],
    }).compile();

    controller = module.get<InitiatorPaymentsController>(
      InitiatorPaymentsController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an initiator payment', async () => {
      const dto: CreateInitiatorPaymentDto = {
        projectReportId: 'report-1',
        initiatorId: 'initiator-1',
        amount: 5000,
      };
      const expected: InitiatorPaymentResponseDto = {
        id: 'payment-1',
        projectReportId: 'report-1',
        initiator: { id: 'initiator-1', name: 'Yaniv Goldman' },
        amount: 5000,
        date: null,
        description: null,
      };
      mockInitiatorPaymentsService.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(result).toEqual(expected);
      expect(mockInitiatorPaymentsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('should update an initiator payment', async () => {
      const dto: UpdateInitiatorPaymentDto = {
        projectReportId: 'report-1',
        initiatorId: 'initiator-1',
        amount: 6000,
      };
      const expected: InitiatorPaymentResponseDto = {
        id: 'payment-1',
        projectReportId: 'report-1',
        initiator: { id: 'initiator-1', name: 'Yaniv Goldman' },
        amount: 6000,
        date: null,
        description: null,
      };
      mockInitiatorPaymentsService.update.mockResolvedValue(expected);

      const result = await controller.update('payment-1', dto);

      expect(result).toEqual(expected);
      expect(mockInitiatorPaymentsService.update).toHaveBeenCalledWith(
        'payment-1',
        dto,
      );
    });

    it('should throw if payment not found', async () => {
      mockInitiatorPaymentsService.update.mockRejectedValue(
        new InitiatorPaymentNotFoundError('payment-1'),
      );

      await expect(
        controller.update('payment-1', {
          projectReportId: 'report-1',
          initiatorId: 'initiator-1',
          amount: 6000,
        }),
      ).rejects.toThrow(InitiatorPaymentNotFoundError);
    });
  });

  describe('remove', () => {
    it('should delete an initiator payment', async () => {
      mockInitiatorPaymentsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('payment-1');

      expect(result).toBeUndefined();
      expect(mockInitiatorPaymentsService.remove).toHaveBeenCalledWith(
        'payment-1',
      );
    });

    it('should throw if payment not found', async () => {
      mockInitiatorPaymentsService.remove.mockRejectedValue(
        new InitiatorPaymentNotFoundError('payment-1'),
      );

      await expect(controller.remove('payment-1')).rejects.toThrow(
        InitiatorPaymentNotFoundError,
      );
    });
  });
});
