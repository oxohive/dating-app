"use client";

export interface UserSearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Search input for filtering the admin user table by name.
 */
export function UserSearchBar({ value, onChange }: UserSearchBarProps) {
  return (
    <input
      type="search"
      placeholder="Search users by name..."
      value={value}
      onChange={(event) => onChange(event.target.value)}
      style={{ padding: 8, width: "100%", maxWidth: 360, marginBottom: 16 }}
    />
  );
}
