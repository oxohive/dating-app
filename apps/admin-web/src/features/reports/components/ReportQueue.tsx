"use client";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Table } from "@/components/Table";
import { Report } from "@/features/reports/api/reports.api";

export interface ReportQueueProps {
  reports: Report[];
  onResolve: (reportId: string) => void;
  loading?: boolean;
}

/**
 * Table of pending moderation reports. Composed from the shared `Table`
 * primitive (same convention as `UserTable`/`VerificationQueue`/
 * `SubscriptionTable`/`PaymentTable`/`AuditLogTable`) instead of hand-rolled
 * table markup - this previously duplicated `Table`'s row/header/empty-state
 * styling verbatim via a dedicated `ReportRow` component.
 */
export function ReportQueue({ reports, onResolve, loading = false }: ReportQueueProps) {
  return (
    <Table<Report>
      rows={reports}
      getRowKey={(report) => report.id}
      emptyMessage="No reports in the queue."
      loading={loading}
      columns={[
        { key: "user", header: "User", render: (report) => report.reportedUserName },
        { key: "reason", header: "Reason", render: (report) => report.reason },
        {
          key: "status",
          header: "Status",
          render: (report) => <Badge tone={report.status === "open" ? "warning" : "success"}>{report.status}</Badge>,
        },
        {
          key: "actions",
          header: "Action",
          render: (report) => (
            <Button variant="secondary" disabled={report.status === "resolved"} onClick={() => onResolve(report.id)}>
              Mark resolved
            </Button>
          ),
        },
      ]}
    />
  );
}
