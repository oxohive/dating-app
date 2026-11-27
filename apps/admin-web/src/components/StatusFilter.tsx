"use client";

import { ListFilter } from "lucide-react";

export interface StatusFilterOption<T extends string> {
  value: T;
  label: string;
}

export interface StatusFilterProps<T extends string> {
  value: T;
  options: Array<StatusFilterOption<T>>;
  onChange: (value: T) => void;
}

/**
 * Generic status-filter dropdown shared by the verification review queue
 * and the subscriptions/payments monitoring views (new in task 0010/W2).
 * Mirrors the existing convention of a thin, typed primitive in
 * `src/components/` (see `Table`, `Badge`, `Button`) that feature
 * components compose, rather than each feature rolling its own `<select>`.
 */
export function StatusFilter<T extends string>({ value, options, onChange }: StatusFilterProps<T>) {
  return (
    <label className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600">
      <ListFilter size={15} className="text-slate-400" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
