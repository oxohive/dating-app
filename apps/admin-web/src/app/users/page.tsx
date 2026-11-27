"use client";

import { useState } from "react";
import { Users as UsersIcon } from "lucide-react";
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
  const { users, loading, error, query, setQuery, markSuspended } = useUsers();
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
      <div className="flex gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <UsersIcon size={22} className="text-primary-600" />
            Users
          </h1>
          <UserSearchBar value={query} onChange={setQuery} />
          {error && <p className="mb-3 text-sm font-medium text-rose-600">{error}</p>}
          <UserTable users={users} onSelect={setSelectedUser} loading={loading} />
        </div>
        <div className="flex-none">
          <UserDetailPanel user={selectedUser} onSuspend={setSuspendTarget} />
          {suspendTarget && (
            <div className="mt-4">
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
