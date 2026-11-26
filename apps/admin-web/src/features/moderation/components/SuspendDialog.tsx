"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { suspendUser } from "@/features/moderation/api/moderation.api";

export interface SuspendDialogProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuspended: () => void;
}

/**
 * Confirmation dialog for suspending a user, used from the user detail panel.
 */
export function SuspendDialog({ userId, userName, onClose, onSuspended }: SuspendDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await suspendUser({ userId, reason });
      onSuspended();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, maxWidth: 360, background: "#fff" }}
    >
      <h4>Suspend {userName}?</h4>
      <textarea
        placeholder="Reason for suspension"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        style={{ width: "100%", minHeight: 80, marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="danger" onClick={handleConfirm} disabled={submitting || reason.trim().length === 0}>
          {submitting ? "Suspending..." : "Confirm suspend"}
        </Button>
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
