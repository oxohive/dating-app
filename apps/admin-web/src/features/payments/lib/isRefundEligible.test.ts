import { isRefundEligible } from "./isRefundEligible";
import { Payment } from "@/features/payments/api/payments.api";

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    subscriptionId: null,
    userId: "user-1",
    provider: "razorpay",
    providerPaymentId: "pay_abc123",
    amountMinorUnits: 19900,
    currency: "INR",
    status: "succeeded",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("isRefundEligible", () => {
  it.each(["pending", "succeeded", "failed"] as const)(
    "returns true for a %s payment",
    (status) => {
      expect(isRefundEligible(makePayment({ status }))).toBe(true);
    },
  );

  it("returns false for an already-refunded payment", () => {
    expect(isRefundEligible(makePayment({ status: "refunded" }))).toBe(false);
  });
});
