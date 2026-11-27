import { LucideIcon } from "lucide-react";

export interface StatTileProps {
  label: string;
  value: number;
  icon: LucideIcon;
  loading?: boolean;
}

/**
 * Single summary-stat tile (e.g. "Total users: 1,204"). Shares the same
 * card chrome (`rounded-lg border ... shadow-card`) as every other
 * admin-web surface, and a skeleton placeholder while loading - same
 * `loading` convention `Table` already uses, so the dashboard doesn't
 * flash "0" before the real numbers arrive.
 */
export function StatTile({ label, value, icon: Icon, loading = false }: StatTileProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-100">
        <Icon size={18} className="text-primary-600" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        {loading ? (
          <div className="mt-1.5 h-6 w-16 animate-pulse rounded bg-slate-200" />
        ) : (
          <p className="mt-0.5 text-2xl font-semibold text-slate-900">{value.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
