"use client";

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
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      style={{ padding: 8, marginBottom: 16 }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
