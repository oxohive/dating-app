"use client";

import { Table } from "@/components/Table";
import { CityBreakdown } from "@/features/dashboard/api/dashboard.api";
import { sortCityBreakdownDescending } from "@/features/dashboard/lib/sortCityBreakdownDescending";

export interface CityBreakdownTableProps {
  entries: CityBreakdown[];
  loading?: boolean;
}

/**
 * Users-by-city breakdown, busiest city first. Shared `Table` primitive,
 * same composition pattern as every other admin-web list view.
 */
export function CityBreakdownTable({ entries, loading = false }: CityBreakdownTableProps) {
  const sorted = sortCityBreakdownDescending(entries);

  return (
    <Table<CityBreakdown>
      rows={sorted}
      getRowKey={(entry) => entry.city}
      emptyMessage="No city data available yet."
      loading={loading}
      columns={[
        {
          key: "city",
          header: "City",
          render: (entry) => <span className="font-medium text-slate-800">{entry.city}</span>,
        },
        {
          key: "count",
          header: "Users",
          render: (entry) => <span className="text-slate-600">{entry.count.toLocaleString()}</span>,
        },
      ]}
    />
  );
}
