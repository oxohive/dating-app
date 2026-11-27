import { Verification } from "@/features/verification/api/verification.api";

/**
 * Pure state-update helper for applying an approve/reject result to the
 * in-memory verification list. Extracted from `useVerifications` so the
 * approve/reject wiring is directly unit-testable without a DOM/React
 * renderer - this app's jest setup is `testEnvironment: "node"` with no
 * React testing library installed (see `src/lib/filterUsersByName.ts` for
 * the established pattern of pulling hook logic into a plain,
 * directly-testable function).
 */
export function applyVerificationReview(verifications: Verification[], updated: Verification): Verification[] {
  return verifications.map((verification) => (verification.id === updated.id ? updated : verification));
}
