import { Payment } from "@/features/payments/api/payments.api";

/**
 * A payment is eligible for an admin-triggered refund unless it has already
 * been refunded. The backend also enforces this (plan.md's refund
 * workflow), but the admin-web refund button must not even be offered for
 * an already-refunded row - extracted as a pure function so this check is
 * directly unit-testable without a DOM/React renderer (this app's jest
 * setup is `testEnvironment: "node"`, same reasoning as
 * `applyVerificationReview`).
 */
export function isRefundEligible(payment: Payment): boolean {
  return payment.status !== "refunded";
}
