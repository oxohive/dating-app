import { applyPaymentRefund } from "./applyPaymentRefund";
import { Payment } from "@/features/payments/api/payments.api";

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    subscriptionId: "sub-1",
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

describe("applyPaymentRefund", () => {
  it("replaces the matching payment with the refunded result", () => {
    const succeeded = makePayment();
    const other = makePayment({ id: "pay-2" });
    const refunded = makePayment({ status: "refunded" });

    const result = applyPaymentRefund([succeeded, other], refunded);

    expect(result).toEqual([refunded, other]);
  });

  it("leaves the list unchanged when no id matches", () => {
    const succeeded = makePayment();
    const unrelatedUpdate = makePayment({ id: "does-not-exist", status: "refunded" });

    const result = applyPaymentRefund([succeeded], unrelatedUpdate);

    expect(result).toEqual([succeeded]);
  });

  it("returns an empty array for an empty list", () => {
    expect(applyPaymentRefund([], makePayment({ status: "refunded" }))).toEqual([]);
  });
});
