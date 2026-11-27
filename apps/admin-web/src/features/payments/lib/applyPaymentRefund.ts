import { Payment } from "@/features/payments/api/payments.api";

/**
 * Pure state-update helper for applying a refund result to the in-memory
 * payments list - same pattern as `applyVerificationReview`, extracted so
 * the refund wiring is directly unit-testable without a DOM/React
 * renderer.
 */
export function applyPaymentRefund(payments: Payment[], updated: Payment): Payment[] {
  return payments.map((payment) => (payment.id === updated.id ? updated : payment));
}
