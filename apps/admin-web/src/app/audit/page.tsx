"use client";

import { ScrollText } from "lucide-react";
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
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <ScrollText size={22} className="text-primary-600" />
        Admin Audit Log
      </h1>
      {error && <p className="mb-3 text-sm font-medium text-rose-600">{error}</p>}
      <AuditLogTable entries={entries} />
    </RequireAdminAuth>
  );
}
