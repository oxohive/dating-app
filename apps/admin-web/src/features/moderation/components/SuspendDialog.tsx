"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/Button";
import { suspendUser } from "@/features/moderation/api/moderation.api";
import { ApiError } from "@/lib/apiClient";

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
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await suspendUser({ userId, reason });
      onSuspended();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not suspend this user. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" className="max-w-sm rounded-lg border border-rose-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-rose-100">
          <TriangleAlert size={16} className="text-rose-600" />
        </div>
        <h4 className="text-sm font-semibold text-slate-900">Suspend {userName}?</h4>
      </div>
      <textarea
        placeholder="Reason for suspension"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="mb-3 w-full min-h-[80px] rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
      />
      {error && <p className="mt-0 mb-3 text-sm font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
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
