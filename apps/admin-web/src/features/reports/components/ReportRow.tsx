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
    <tr className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50">
      <td className="px-4 py-3 text-slate-700">{report.reportedUserName}</td>
      <td className="px-4 py-3 text-slate-700">{report.reason}</td>
      <td className="px-4 py-3">
        <Badge tone={report.status === "open" ? "warning" : "success"}>{report.status}</Badge>
      </td>
      <td className="px-4 py-3">
        <Button variant="secondary" disabled={report.status === "resolved"} onClick={() => onResolve(report.id)}>
          Mark resolved
        </Button>
      </td>
    </tr>
  );
}
