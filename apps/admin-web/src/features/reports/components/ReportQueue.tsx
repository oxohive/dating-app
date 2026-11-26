"use client";

import { Report } from "@/features/reports/api/reports.api";
import { ReportRow } from "@/features/reports/components/ReportRow";

export interface ReportQueueProps {
  reports: Report[];
  onResolve: (reportId: string) => void;
}

/**
 * Table of pending moderation reports.
 */
export function ReportQueue({ reports, onResolve }: ReportQueueProps) {
  if (reports.length === 0) {
    return <p>No reports in the queue.</p>;
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: 8 }}>User</th>
          <th style={{ textAlign: "left", padding: 8 }}>Reason</th>
          <th style={{ textAlign: "left", padding: 8 }}>Status</th>
          <th style={{ textAlign: "left", padding: 8 }}>Action</th>
        </tr>
      </thead>
      <tbody>
        {reports.map((report) => (
          <ReportRow key={report.id} report={report} onResolve={onResolve} />
        ))}
      </tbody>
    </table>
  );
}
