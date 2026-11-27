"use client";

import { Badge } from "@/components/Badge";
import { Table } from "@/components/Table";
import { AdminUser } from "@/features/users/api/users.api";

export interface UserTableProps {
  users: AdminUser[];
  onSelect: (user: AdminUser) => void;
  loading?: boolean;
}

/**
 * Renders the admin user search results as a table.
 */
export function UserTable({ users, onSelect, loading = false }: UserTableProps) {
  return (
    <Table<AdminUser>
      rows={users}
      getRowKey={(user) => user.id}
      emptyMessage="No users match your search."
      loading={loading}
      columns={[
        { key: "name", header: "Name", render: (user) => (
          <button
            onClick={() => onSelect(user)}
            className="font-medium text-primary-600 transition-colors hover:text-primary-800 hover:underline"
          >
            {user.displayName}
          </button>
        ) },
        { key: "phone", header: "Phone", render: (user) => <span className="text-slate-600">{user.phone}</span> },
        { key: "status", header: "Status", render: (user) => (
          <Badge tone={user.status === "active" ? "success" : "danger"}>{user.status}</Badge>
        ) },
        { key: "role", header: "Role", render: (user) => (
          user.isAdmin ? <Badge tone="neutral">admin</Badge> : null
        ) },
      ]}
    />
  );
}
