"use client";

import { useCallback, useEffect, useState } from "react";
import {
  approveVerification,
  listVerifications,
  rejectVerification,
  Verification,
  VerificationStatusFilter,
} from "@/features/verification/api/verification.api";
import { applyVerificationReview } from "@/features/verification/lib/applyVerificationReview";
import { ApiError } from "@/lib/apiClient";

export interface UseVerificationsResult {
  verifications: Verification[];
  loading: boolean;
  error: string | null;
  statusFilter: VerificationStatusFilter;
  setStatusFilter: (filter: VerificationStatusFilter) => void;
  approve: (verificationId: string) => Promise<void>;
  reject: (verificationId: string) => Promise<void>;
}

/**
 * Loads the verification review queue for the selected status filter
 * ("pending" by default - the queue's primary job - but switchable to
 * "approved" / "rejected" / "all" so already-reviewed submissions and
 * their review history remain visible, not just the pending ones) and
 * exposes approve/reject actions.
 */
export function useVerifications(): UseVerificationsResult {
  const [statusFilter, setStatusFilter] = useState<VerificationStatusFilter>("pending");
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filter: VerificationStatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const results = await listVerifications(filter);
      setVerifications(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load verifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(statusFilter);
  }, [load, statusFilter]);

  const approve = useCallback(async (verificationId: string) => {
    setError(null);
    try {
      const updated = await approveVerification(verificationId);
      setVerifications((current) => applyVerificationReview(current, updated));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve this verification. Please try again.");
    }
  }, []);

  const reject = useCallback(async (verificationId: string) => {
    setError(null);
    try {
      const updated = await rejectVerification(verificationId);
      setVerifications((current) => applyVerificationReview(current, updated));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject this verification. Please try again.");
    }
  }, []);

  return { verifications, loading, error, statusFilter, setStatusFilter, approve, reject };
}
