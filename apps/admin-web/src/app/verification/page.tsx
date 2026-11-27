"use client";

import { ShieldCheck } from "lucide-react";
import { StatusFilter } from "@/components/StatusFilter";
import { RequireAdminAuth } from "@/features/auth/components/RequireAdminAuth";
import { VerificationQueue } from "@/features/verification/components/VerificationQueue";
import { useVerifications } from "@/features/verification/hooks/useVerifications";
import { VerificationStatusFilter } from "@/features/verification/api/verification.api";

const STATUS_OPTIONS: Array<{ value: VerificationStatusFilter; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

/**
 * Verification review queue page: thin composition of the verification
 * feature's components. All data access happens in the feature's
 * hook/api.
 */
export default function VerificationPage() {
  const { verifications, loading, error, statusFilter, setStatusFilter, approve, reject } = useVerifications();

  return (
    <RequireAdminAuth>
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <ShieldCheck size={22} className="text-primary-600" />
        Verification Review Queue
      </h1>
      <StatusFilter value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
      {error && <p className="mb-3 text-sm font-medium text-rose-600">{error}</p>}
      <VerificationQueue verifications={verifications} onApprove={approve} onReject={reject} loading={loading} />
    </RequireAdminAuth>
  );
}
