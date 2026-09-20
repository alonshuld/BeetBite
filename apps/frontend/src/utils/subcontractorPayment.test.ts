import { describe, it, expect } from "vitest";
import { computeSubcontractorRemainder } from "./subcontractorPayment";

describe("computeSubcontractorRemainder", () => {
  it("computes profit as totalIncome × profitMargin / 100", () => {
    const { profit } = computeSubcontractorRemainder({
      totalIncome: 50000,
      profitMargin: 20,
      supplierPayments: [],
    });
    expect(profit).toBe(10000);
  });

  it("subtracts profit and every supplier payment from totalIncome", () => {
    const { subcontractorPayment } = computeSubcontractorRemainder({
      totalIncome: 50000,
      profitMargin: 20,
      supplierPayments: [{ amount: 5000 }, { amount: 3000 }],
    });
    // 50000 - 10000 profit - 8000 supplier total = 32000
    expect(subcontractorPayment).toBe(32000);
  });

  it("treats no supplier payments as zero deduction", () => {
    const { subcontractorPayment } = computeSubcontractorRemainder({
      totalIncome: 10000,
      profitMargin: 0,
      supplierPayments: [],
    });
    expect(subcontractorPayment).toBe(10000);
  });

  it("never mutates the supplierPayments it reads", () => {
    const supplierPayments = [{ amount: 100 }];
    computeSubcontractorRemainder({
      totalIncome: 1000,
      profitMargin: 10,
      supplierPayments,
    });
    expect(supplierPayments).toEqual([{ amount: 100 }]);
  });
});
