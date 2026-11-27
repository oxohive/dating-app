import { apiClient } from "@/lib/apiClient";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type PaymentStatusFilter = PaymentStatus | "all";

export interface Payment {
  id: string;
  subscriptionId: string | null;
  userId: string;
  provider: string;
  providerPaymentId: string;
  amountMinorUnits: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
}

/**
 * Confirmed shape of `PaymentAdminOut`, verified field-for-field against
 * the real schema in
 * `services/backend/packages/api/features/admin/schemas.py`: id,
 * subscription_id FK (nullable - a payment can precede subscription
 * activation), user_id FK, provider (e.g. "razorpay"), provider_payment_id,
 * amount_minor_units, currency, status (pending|succeeded|failed|refunded),
 * created_at - exact match, no reconciliation needed. This wave has no real
 * Razorpay keys wired (plan.md's "Risks" section) - this view is
 * monitoring/visibility only, never a payment-processing surface.
 */
interface PaymentAdminApiModel {
  id: string;
  subscription_id: string | null;
  user_id: string;
  provider: string;
  provider_payment_id: string;
  amount_minor_units: number;
  currency: string;
  status: PaymentStatus;
  created_at: string;
}

export function mapPayment(raw: PaymentAdminApiModel): Payment {
  return {
    id: raw.id,
    subscriptionId: raw.subscription_id,
    userId: raw.user_id,
    provider: raw.provider,
    providerPaymentId: raw.provider_payment_id,
    amountMinorUnits: raw.amount_minor_units,
    currency: raw.currency,
    status: raw.status,
    createdAt: raw.created_at,
  };
}

/**
 * Builds the list path for a given status filter. Extracted as a pure
 * function so the filtering behavior is directly unit-testable without
 * mocking `fetch` - same spirit as `src/lib/filterUsersByName.ts`.
 */
export function buildPaymentsQuery(filter: PaymentStatusFilter): string {
  if (filter === "all") {
    return "/admin/payments";
  }
  return `/admin/payments?status=${encodeURIComponent(filter)}`;
}

/**
 * Lists payments, optionally filtered by status.
 * Confirmed endpoint: `GET /admin/payments` (all) or
 * `GET /admin/payments?status=pending|succeeded|failed|refunded` -> 200
 * list (requires is_admin).
 */
export async function listPayments(filter: PaymentStatusFilter = "all"): Promise<Payment[]> {
  const results = await apiClient.get<PaymentAdminApiModel[]>(buildPaymentsQuery(filter));
  return results.map(mapPayment);
}

/**
 * Formats a minor-unit amount (e.g. paise) as a display string, e.g.
 * `formatAmount(19900, "INR")` -> `"INR 199.00"`. Pure + exported so it's
 * directly testable.
 */
export function formatAmount(amountMinorUnits: number, currency: string): string {
  return `${currency} ${(amountMinorUnits / 100).toFixed(2)}`;
}

/**
 * Triggers an admin refund for a payment.
 * Confirmed endpoint (subtask B8,
 * `services/backend/packages/api/features/admin/**`, now landed):
 * `POST /admin/payments/{id}/refund` with no request body -> 200
 * `PaymentAdminOut` with `status: "refunded"` (requires is_admin), verified
 * against the real route in
 * `services/backend/packages/api/features/admin/routes.py`. Per plan.md,
 * the backend also cascades to `Payment.subscription_id`'s subscription
 * (cancelling it if still active) - that cascade is reflected only in the
 * payment's own returned status here; this view does not separately
 * refetch subscriptions after a refund.
 */
export async function refundPayment(paymentId: string): Promise<Payment> {
  const result = await apiClient.post<PaymentAdminApiModel>(`/admin/payments/${paymentId}/refund`);
  return mapPayment(result);
}
