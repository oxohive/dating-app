"use client";

import { Table } from "@/components/Table";
import { AuditLogEntry } from "@/features/audit/api/audit.api";

export interface AuditLogTableProps {
  entries: AuditLogEntry[];
  loading?: boolean;
}

/**
 * Read-only table of admin audit-log entries, newest first (ordering is
 * applied upstream by `useAuditLog`/`sortAuditLogNewestFirst`). Consistent
 * with how the existing `reports`/`users` admin-web pages lay out a simple
 * list view: a single `Table` composed with feature-specific columns.
 */
export function AuditLogTable({ entries, loading = false }: AuditLogTableProps) {
  return (
    <Table<AuditLogEntry>
      rows={entries}
      getRowKey={(entry) => entry.id}
      emptyMessage="No admin actions have been recorded yet."
      loading={loading}
      columns={[
        { key: "action", header: "Action", render: (entry) => <span className="font-medium text-slate-800">{entry.action}</span> },
        {
          key: "target",
          header: "Target",
          render: (entry) => <span className="text-slate-600">{`${entry.targetType}:${entry.targetId}`}</span>,
        },
        { key: "admin", header: "Admin", render: (entry) => <span className="text-slate-600">{entry.adminUserId}</span> },
        {
          key: "createdAt",
          header: "Created at",
          render: (entry) => <span className="text-slate-500">{new Date(entry.createdAt).toLocaleString()}</span>,
        },
      ]}
    />
  );
}
