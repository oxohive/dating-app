"use client";

import { RequireAdminAuth } from "@/features/auth/components/RequireAdminAuth";
import { AuditLogTable } from "@/features/audit/components/AuditLogTable";
import { useAuditLog } from "@/features/audit/hooks/useAuditLog";

/**
 * Audit log page: thin composition of the audit feature's components. All
 * data access happens in the feature's hook/api, same pattern as the
 * reports/verification pages.
 */
export default function AuditPage() {
  const { entries, error } = useAuditLog();

  return (
    <RequireAdminAuth>
      <h1>Admin Audit Log</h1>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      <AuditLogTable entries={entries} />
    </RequireAdminAuth>
  );
}
