"use client";

import { ReportQueue } from "@/features/reports/components/ReportQueue";
import { useReports } from "@/features/reports/hooks/useReports";
import { RequireAdminAuth } from "@/features/auth/components/RequireAdminAuth";

/**
 * Reports page: thin composition of the reports feature components.
 */
export default function ReportsPage() {
  const { reports, error, resolve } = useReports();

  return (
    <RequireAdminAuth>
      <h1>Report Queue</h1>
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      <ReportQueue reports={reports} onResolve={resolve} />
    </RequireAdminAuth>
  );
}
