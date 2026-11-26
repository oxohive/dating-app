"use client";

import { useState } from "react";
import { UserSearchBar } from "@/features/users/components/UserSearchBar";
import { UserTable } from "@/features/users/components/UserTable";
import { UserDetailPanel } from "@/features/users/components/UserDetailPanel";
import { useUsers } from "@/features/users/hooks/useUsers";
import { AdminUser } from "@/features/users/api/users.api";
import { SuspendDialog } from "@/features/moderation/components/SuspendDialog";
import { RequireAdminAuth } from "@/features/auth/components/RequireAdminAuth";

/**
 * Users page: thin composition of the users feature components plus the
 * moderation suspend dialog. All data access happens in feature hooks/api.
 */
export default function UsersPage() {
  const { users, error, query, setQuery, markSuspended } = useUsers();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);

  function handleSuspended() {
    if (suspendTarget) {
      markSuspended(suspendTarget.id);
      setSelectedUser((current) => (current && current.id === suspendTarget.id ? { ...current, status: "suspended" } : current));
    }
    setSuspendTarget(null);
  }

  return (
    <RequireAdminAuth>
      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h1>Users</h1>
          <UserSearchBar value={query} onChange={setQuery} />
          {error && <p style={{ color: "#dc2626" }}>{error}</p>}
          <UserTable users={users} onSelect={setSelectedUser} />
        </div>
        <div>
          <UserDetailPanel user={selectedUser} onSuspend={setSuspendTarget} />
          {suspendTarget && (
            <div style={{ marginTop: 16 }}>
              <SuspendDialog
                userId={suspendTarget.id}
                userName={suspendTarget.displayName}
                onClose={() => setSuspendTarget(null)}
                onSuspended={handleSuspended}
              />
            </div>
          )}
        </div>
      </div>
    </RequireAdminAuth>
  );
}
