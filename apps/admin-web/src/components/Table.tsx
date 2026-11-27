import { Inbox } from "lucide-react";

export interface TableColumn<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  key: string;
}

export interface TableProps<T> {
  columns: Array<TableColumn<T>>;
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
  /**
   * True while the rows for this table are being fetched. Every feature
   * hook (`useUsers`, `useReports`, `useVerifications`, `usePayments`,
   * `useSubscriptions`, `useAuditLog`) already exposes a `loading` flag,
   * but no page previously read it, so a list appeared indistinguishable
   * from a genuine "no results" empty state while its first fetch was in
   * flight. Only used when `rows` is still empty - once rows exist from a
   * prior fetch, a filter-change refetch keeps showing them rather than
   * replacing them with a skeleton, to avoid flicker.
   */
  loading?: boolean;
}

/**
 * Shared primitive table used across every admin-web feature (users,
 * reports, verification, subscriptions, payments, audit log).
 */
export function Table<T>({
  columns,
  rows,
  getRowKey,
  emptyMessage = "No data to display.",
  loading = false,
}: TableProps<T>) {
  if (rows.length === 0 && loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
        <span className="sr-only" role="status">
          Loading…
        </span>
        <table className="w-full border-collapse text-left text-sm" aria-hidden="true">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    <div className="h-4 w-full max-w-[12rem] animate-pulse rounded bg-slate-200" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white py-14 text-center">
        <Inbox size={28} className="text-slate-400" />
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((column) => (
              <th
                key={column.key}
                className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="transition-colors hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 align-middle text-slate-700">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
