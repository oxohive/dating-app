"use client";

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
    return <p>Select a user to see details.</p>;
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, maxWidth: 320 }}>
      <h3>{user.displayName}</h3>
      <p>{user.phone}</p>
      <p>{user.city}</p>
      <p>
        Status: <Badge tone={user.status === "active" ? "success" : "danger"}>{user.status}</Badge>
      </p>
      <Button variant="danger" onClick={() => onSuspend(user)} disabled={user.status === "suspended"}>
        Suspend user
      </Button>
    </div>
  );
}
