"use client";

import { Inbox } from "lucide-react";
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
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white py-14 text-center">
        <Inbox size={28} className="text-slate-400" />
        <p className="text-sm text-slate-500">No reports in the queue.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Reason</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} onResolve={onResolve} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
