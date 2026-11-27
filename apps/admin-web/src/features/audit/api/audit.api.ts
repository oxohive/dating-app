import { apiClient } from "@/lib/apiClient";

export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  adminUserId: string;
  createdAt: string;
}

/**
 * Confirmed shape of the admin-audit-log response from subtask B8
 * (`services/backend/packages/api/features/admin/**`, now landed).
 * Verified field-for-field against the real `AdminAuditLogOut` schema in
 * `services/backend/packages/api/features/admin/schemas.py`: id,
 * admin_user_id, action, target_type, target_id, created_at - exact match,
 * no reconciliation needed.
 */
interface AuditLogApiModel {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  admin_user_id: string;
  created_at: string;
}

export function mapAuditLogEntry(raw: AuditLogApiModel): AuditLogEntry {
  return {
    id: raw.id,
    action: raw.action,
    targetType: raw.target_type,
    targetId: raw.target_id,
    adminUserId: raw.admin_user_id,
    createdAt: raw.created_at,
  };
}

/**
 * Lists admin audit-log entries.
 * Confirmed endpoint: `GET /admin/audit-log` -> 200 list (requires
 * is_admin). The real route also accepts optional `?limit=&offset=` query
 * params (default limit 50, offset 0), left unused here since this caller
 * wants the simple default list. Ordering is not assumed to be guaranteed
 * by the backend, so the caller (`useAuditLog`) still re-sorts
 * newest-first client-side via `sortAuditLogNewestFirst`.
 */
export async function listAuditLog(): Promise<AuditLogEntry[]> {
  const results = await apiClient.get<AuditLogApiModel[]>("/admin/audit-log");
  return results.map(mapAuditLogEntry);
}
