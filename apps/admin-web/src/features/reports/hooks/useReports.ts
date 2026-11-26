"use client";

import { useCallback, useEffect, useState } from "react";
import { listReports, resolveReport, Report } from "@/features/reports/api/reports.api";
import { ApiError } from "@/lib/apiClient";

export interface UseReportsResult {
  reports: Report[];
  loading: boolean;
  error: string | null;
  resolve: (reportId: string) => Promise<void>;
}

/**
 * Loads the open report queue and exposes an action to resolve a report.
 */
export function useReports(): UseReportsResult {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await listReports("open");
      setReports(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = useCallback(async (reportId: string) => {
    setError(null);
    try {
      await resolveReport(reportId);
      setReports((current) =>
        current.map((report) => (report.id === reportId ? { ...report, status: "resolved" } : report))
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not resolve this report. Please try again.");
    }
  }, []);

  return { reports, loading, error, resolve };
}
