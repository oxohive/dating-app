"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listSubscriptions,
  Subscription,
  SubscriptionStatusFilter,
} from "@/features/payments/api/subscriptions.api";
import { ApiError } from "@/lib/apiClient";

export interface UseSubscriptionsResult {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  statusFilter: SubscriptionStatusFilter;
  setStatusFilter: (filter: SubscriptionStatusFilter) => void;
}

/**
 * Loads the subscriptions monitoring list for the selected status filter
 * ("all" by default). Read-only - this wave is explicitly not about
 * processing real payments, only visibility for the admin team.
 */
export function useSubscriptions(): UseSubscriptionsResult {
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>("all");
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filter: SubscriptionStatusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const results = await listSubscriptions(filter);
      setSubscriptions(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load subscriptions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(statusFilter);
  }, [load, statusFilter]);

  return { subscriptions, loading, error, statusFilter, setStatusFilter };
}
