"use client";

import { Flag } from "lucide-react";
import { ReportQueue } from "@/features/reports/components/ReportQueue";
import { useReports } from "@/features/reports/hooks/useReports";
import { RequireAdminAuth } from "@/features/auth/components/RequireAdminAuth";

/**
 * Reports page: thin composition of the reports feature components.
 */
export default function ReportsPage() {
  const { reports, loading, error, resolve } = useReports();

  return (
    <RequireAdminAuth>
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <Flag size={22} className="text-primary-600" />
        Report Queue
      </h1>
      {error && <p className="mb-3 text-sm font-medium text-rose-600">{error}</p>}
      <ReportQueue reports={reports} onResolve={resolve} loading={loading} />
    </RequireAdminAuth>
  );
}
