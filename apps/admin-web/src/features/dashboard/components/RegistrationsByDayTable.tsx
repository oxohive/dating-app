"use client";

import { Table } from "@/components/Table";
import { RegistrationsByDay } from "@/features/dashboard/api/dashboard.api";
import { computeBarWidthPercent } from "@/features/dashboard/lib/computeBarWidthPercent";
import { sortRegistrationsByDayAscending } from "@/features/dashboard/lib/sortRegistrationsByDayAscending";

export interface RegistrationsByDayTableProps {
  entries: RegistrationsByDay[];
  loading?: boolean;
}

/**
 * Registrations-by-day view: the shared `Table` primitive (no ad-hoc
 * markup, no new charting library - none is installed, per plan.md
 * section 4) with a CSS-bar rendered inside the "Registrations" column,
 * scaled relative to the series' own max via `computeBarWidthPercent`.
 */
export function RegistrationsByDayTable({ entries, loading = false }: RegistrationsByDayTableProps) {
  const sorted = sortRegistrationsByDayAscending(entries);
  const maxCount = sorted.reduce((max, entry) => Math.max(max, entry.count), 0);

  return (
    <Table<RegistrationsByDay>
      rows={sorted}
      getRowKey={(entry) => entry.date}
      emptyMessage="No registrations in the last 30 days."
      loading={loading}
      columns={[
        {
          key: "date",
          header: "Date",
          render: (entry) => (
            <span className="text-slate-600">{new Date(entry.date).toLocaleDateString()}</span>
          ),
        },
        {
          key: "count",
          header: "Registrations",
          render: (entry) => (
            <div className="flex items-center gap-3">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary-500"
                  style={{ width: `${computeBarWidthPercent(entry.count, maxCount)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-700">{entry.count}</span>
            </div>
          ),
        },
      ]}
    />
  );
}
