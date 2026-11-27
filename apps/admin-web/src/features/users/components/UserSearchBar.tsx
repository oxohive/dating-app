"use client";

import { Search } from "lucide-react";

export interface UserSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Search input for filtering the admin user table by name.
 */
export function UserSearchBar({ value, onChange }: UserSearchBarProps) {
  return (
    <div className="relative mb-4 max-w-sm">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        placeholder="Search users by name..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
      />
    </div>
  );
}
