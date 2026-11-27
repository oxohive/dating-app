import { buildPaymentsQuery, formatAmount, mapPayment } from "./payments.api";

describe("buildPaymentsQuery", () => {
  it("omits the status query param for 'all'", () => {
    expect(buildPaymentsQuery("all")).toBe("/admin/payments");
  });

  it("adds a status query param for a specific status", () => {
    expect(buildPaymentsQuery("pending")).toBe("/admin/payments?status=pending");
    expect(buildPaymentsQuery("succeeded")).toBe("/admin/payments?status=succeeded");
    expect(buildPaymentsQuery("failed")).toBe("/admin/payments?status=failed");
    expect(buildPaymentsQuery("refunded")).toBe("/admin/payments?status=refunded");
  });
});

describe("mapPayment", () => {
  it("maps a nullable subscription_id through", () => {
    const mapped = mapPayment({
      id: "pay-1",
      subscription_id: null,
      user_id: "user-1",
      provider: "razorpay",
      provider_payment_id: "pay_abc123",
      amount_minor_units: 19900,
      currency: "INR",
      status: "succeeded",
      created_at: "2026-01-01T00:00:00Z",
    });

    expect(mapped.subscriptionId).toBeNull();
    expect(mapped.amountMinorUnits).toBe(19900);
  });
});

describe("formatAmount", () => {
  it("formats minor units as a major-unit display string", () => {
    expect(formatAmount(19900, "INR")).toBe("INR 199.00");
    expect(formatAmount(0, "INR")).toBe("INR 0.00");
    expect(formatAmount(50, "INR")).toBe("INR 0.50");
  });
});
