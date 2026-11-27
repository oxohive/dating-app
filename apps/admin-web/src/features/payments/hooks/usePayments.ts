"use client";

import { useCallback, useEffect, useState } from "react";
import { listPayments, Payment, PaymentStatusFilter } from "@/features/payments/api/payments.api";
import { ApiError } from "@/lib/apiClient";

export interface UsePaymentsResult {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  statusFilter: PaymentStatusFilter;
  setStatusFilter: (filter: PaymentStatusFilter) => void;
}

/**
 * Loads the payments monitoring list for the selected status filter
 * ("all" by default). Read-only - this wave is explicitly not about
 * processing real payments, only visibility for the admin team.
 */
export function usePayments(): UsePaymentsResult {
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filter: PaymentStatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const results = await listPayments(filter);
      setPayments(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load payments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(statusFilter);
  }, [load, statusFilter]);

  return { payments, loading, error, statusFilter, setStatusFilter };
}
