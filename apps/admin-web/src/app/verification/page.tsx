"use client";

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
  const { verifications, error, statusFilter, setStatusFilter, approve, reject } = useVerifications();

  return (
    <RequireAdminAuth>
      <h1>Verification Review Queue</h1>
      <StatusFilter value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      <VerificationQueue verifications={verifications} onApprove={approve} onReject={reject} />
    </RequireAdminAuth>
  );
}
