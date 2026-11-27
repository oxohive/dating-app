"use client";

import { Table } from "@/components/Table";
import { AuditLogEntry } from "@/features/audit/api/audit.api";

export interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

/**
 * Read-only table of admin audit-log entries, newest first (ordering is
 * applied upstream by `useAuditLog`/`sortAuditLogNewestFirst`). Consistent
 * with how the existing `reports`/`users` admin-web pages lay out a simple
 * list view: a single `Table` composed with feature-specific columns.
 */
export function AuditLogTable({ entries }: AuditLogTableProps) {
  return (
    <Table<AuditLogEntry>
      rows={entries}
      getRowKey={(entry) => entry.id}
      emptyMessage="No admin actions have been recorded yet."
      columns={[
        { key: "action", header: "Action", render: (entry) => entry.action },
        {
          key: "target",
          header: "Target",
          render: (entry) => `${entry.targetType}:${entry.targetId}`,
        },
        { key: "admin", header: "Admin", render: (entry) => entry.adminUserId },
        {
          key: "createdAt",
          header: "Created at",
          render: (entry) => new Date(entry.createdAt).toLocaleString(),
        },
      ]}
    />
  );
}
