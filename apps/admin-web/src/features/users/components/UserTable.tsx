"use client";

import { Badge } from "@/components/Badge";
import { Table } from "@/components/Table";
import { AdminUser } from "@/features/users/api/users.api";

export interface UserTableProps {
  users: AdminUser[];
  onSelect: (user: AdminUser) => void;
}

/**
 * Renders the admin user search results as a table.
 */
export function UserTable({ users, onSelect }: UserTableProps) {
  return (
    <Table<AdminUser>
      rows={users}
      getRowKey={(user) => user.id}
      emptyMessage="No users match your search."
      columns={[
        { key: "name", header: "Name", render: (user) => (
          <button onClick={() => onSelect(user)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer" }}>
            {user.displayName}
          </button>
        ) },
        { key: "phone", header: "Phone", render: (user) => user.phone },
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
