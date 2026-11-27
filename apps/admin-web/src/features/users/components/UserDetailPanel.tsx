"use client";

import { UserRound } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { AdminUser } from "@/features/users/api/users.api";

export interface UserDetailPanelProps {
  user: AdminUser | null;
  onSuspend: (user: AdminUser) => void;
}

/**
 * Side panel showing details for the selected user, with a suspend action
 * that opens the moderation SuspendDialog.
 */
export function UserDetailPanel({ user, onSuspend }: UserDetailPanelProps) {
  if (!user) {
    return (
      <div className="flex w-80 flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white py-14 text-center">
        <UserRound size={24} className="text-slate-400" />
        <p className="text-sm text-slate-500">Select a user to see details.</p>
      </div>
    );
  }

  return (
    <div className="w-80 rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <h3 className="text-base font-semibold text-slate-900">{user.displayName}</h3>
      <p className="mt-1 text-sm text-slate-500">{user.phone}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={user.status === "active" ? "success" : "danger"}>{user.status}</Badge>
        {user.isAdmin && <Badge tone="neutral">admin</Badge>}
      </div>
      <div className="mt-4">
        <Button variant="danger" onClick={() => onSuspend(user)} disabled={user.status === "suspended"}>
          Suspend user
        </Button>
      </div>
    </div>
  );
}
