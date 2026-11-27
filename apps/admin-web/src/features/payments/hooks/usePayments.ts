"use client";

import { useCallback, useEffect, useState } from "react";
import { listPayments, Payment, PaymentStatusFilter, refundPayment } from "@/features/payments/api/payments.api";
import { applyPaymentRefund } from "@/features/payments/lib/applyPaymentRefund";
import { ApiError } from "@/lib/apiClient";

export interface UsePaymentsResult {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  statusFilter: PaymentStatusFilter;
  setStatusFilter: (filter: PaymentStatusFilter) => void;
  refund: (paymentId: string) => Promise<void>;
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

  const refund = useCallback(async (paymentId: string) => {
    setError(null);
    try {
      const updated = await refundPayment(paymentId);
      setPayments((current) => applyPaymentRefund(current, updated));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not refund this payment. Please try again.");
    }
  }, []);

  return { payments, loading, error, statusFilter, setStatusFilter, refund };
}
