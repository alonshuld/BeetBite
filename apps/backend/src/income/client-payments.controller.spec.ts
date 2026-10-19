import { Test, TestingModule } from '@nestjs/testing';
import { ClientPaymentsController } from './client-payments.controller';
import { ClientPaymentsService } from './client-payments.service';
import { ClientPaymentOverpaymentError } from './errors/client-payment-overpayment.error';

describe('ClientPaymentsController', () => {
  let controller: ClientPaymentsController;

  const mockService = {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    setVatPayment: vi.fn(),
    payInFull: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientPaymentsController],
      providers: [{ provide: ClientPaymentsService, useValue: mockService }],
    }).compile();

    controller = module.get(ClientPaymentsController);
    vi.clearAllMocks();
  });

  it('creates a payment', async () => {
    const dto = {
      projectReportId: 'report-1',
      amount: 100,
      paymentDate: '2026-05-12',
    };
    const created = { id: 'p1', ...dto };
    mockService.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toBe(created);
    expect(mockService.create).toHaveBeenCalledWith(dto);
  });

  it('passes the overpayment refusal through', async () => {
    mockService.create.mockRejectedValue(
      new ClientPaymentOverpaymentError(100, 50, 60),
    );

    await expect(
      controller.create({
        projectReportId: 'report-1',
        amount: 60,
        paymentDate: '2026-05-12',
      }),
    ).rejects.toBeInstanceOf(ClientPaymentOverpaymentError);
  });

  it('updates a payment', async () => {
    mockService.update.mockResolvedValue({ id: 'p1' });

    await controller.update('p1', { paymentDate: '2026-05-20' });

    expect(mockService.update).toHaveBeenCalledWith('p1', {
      paymentDate: '2026-05-20',
    });
  });

  it('deletes a payment', async () => {
    await controller.remove('p1');

    expect(mockService.remove).toHaveBeenCalledWith('p1');
  });

  it("marks the month's VAT paid", async () => {
    await controller.setVatPayment('report-1', { vatPaidAt: '2026-06-03' });

    expect(mockService.setVatPayment).toHaveBeenCalledWith(
      'report-1',
      '2026-06-03',
    );
  });

  it('marks the month paid in full', async () => {
    await controller.payInFull('report-1', { paymentDate: '2026-05-20' });

    expect(mockService.payInFull).toHaveBeenCalledWith(
      'report-1',
      '2026-05-20',
    );
  });
});
