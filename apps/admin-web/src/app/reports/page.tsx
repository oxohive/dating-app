"use client";

import { ReportQueue } from "@/features/reports/components/ReportQueue";
import { useReports } from "@/features/reports/hooks/useReports";

/**
 * Reports page: thin composition of the reports feature components.
 */
export default function ReportsPage() {
  const { reports, resolve } = useReports();

  return (
    <div>
      <h1>Report Queue</h1>
      <ReportQueue reports={reports} onResolve={resolve} />
    </div>
  );
}
