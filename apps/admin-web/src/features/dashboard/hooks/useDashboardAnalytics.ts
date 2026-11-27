"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardAnalytics, getDashboardAnalytics } from "@/features/dashboard/api/dashboard.api";
import { ApiError } from "@/lib/apiClient";

export interface UseDashboardAnalyticsResult {
  analytics: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
}

/**
 * Loads the admin analytics summary once on mount. Read-only - this page
 * only displays aggregate stats, same spirit as the payments/audit
 * monitoring views.
 */
export function useDashboardAnalytics(): UseDashboardAnalyticsResult {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getDashboardAnalytics();
      setAnalytics(result);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not load dashboard analytics. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { analytics, loading, error };
}
