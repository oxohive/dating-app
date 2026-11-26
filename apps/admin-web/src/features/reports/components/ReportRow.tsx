"use client";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Report } from "@/features/reports/api/reports.api";

export interface ReportRowProps {
  report: Report;
  onResolve: (reportId: string) => void;
}

/**
 * Single row in the report queue table.
 */
export function ReportRow({ report, onResolve }: ReportRowProps) {
  return (
    <tr>
      <td style={{ padding: 8 }}>{report.reportedUserName}</td>
      <td style={{ padding: 8 }}>{report.reason}</td>
      <td style={{ padding: 8 }}>
        <Badge tone={report.status === "open" ? "warning" : "success"}>{report.status}</Badge>
      </td>
      <td style={{ padding: 8 }}>
        <Button variant="secondary" disabled={report.status === "resolved"} onClick={() => onResolve(report.id)}>
          Mark resolved
        </Button>
      </td>
    </tr>
  );
}
