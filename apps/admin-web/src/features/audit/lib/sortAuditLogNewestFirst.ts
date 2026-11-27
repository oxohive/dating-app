import { AuditLogEntry } from "@/features/audit/api/audit.api";

/**
 * Pure state-update helper that orders audit-log entries newest-first by
 * `createdAt`. Extracted as a standalone function (same pattern as
 * `applyVerificationReview`) so the ordering is directly unit-testable
 * without a DOM/React renderer, and so `listAuditLog` doesn't have to rely
 * on the backend guaranteeing response order.
 */
export function sortAuditLogNewestFirst(entries: AuditLogEntry[]): AuditLogEntry[] {
  return [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
