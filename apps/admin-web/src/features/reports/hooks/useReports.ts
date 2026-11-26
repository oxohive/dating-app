"use client";

import { useCallback, useEffect, useState } from "react";
import { listReports, resolveReport, Report } from "@/features/reports/api/reports.api";

export interface UseReportsResult {
  reports: Report[];
  loading: boolean;
  resolve: (reportId: string) => Promise<void>;
}

/**
 * Loads the report queue and exposes an action to resolve a report.
 */
export function useReports(): UseReportsResult {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const results = await listReports();
      setReports(results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resolve = useCallback(
    async (reportId: string) => {
      await resolveReport(reportId);
      setReports((current) =>
        current.map((report) => (report.id === reportId ? { ...report, status: "resolved" } : report))
      );
    },
    []
  );

  return { reports, loading, resolve };
}
