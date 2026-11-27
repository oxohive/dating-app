"use client";

import { useCallback, useEffect, useState } from "react";
import { AuditLogEntry, listAuditLog } from "@/features/audit/api/audit.api";
import { sortAuditLogNewestFirst } from "@/features/audit/lib/sortAuditLogNewestFirst";
import { ApiError } from "@/lib/apiClient";

export interface UseAuditLogResult {
  entries: AuditLogEntry[];
  loading: boolean;
  error: string | null;
}

/**
 * Loads the full admin audit log, newest action first. Read-only - this
 * view is visibility only, same spirit as the payments monitoring view.
 */
export function useAuditLog(): UseAuditLogResult {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await listAuditLog();
      setEntries(sortAuditLogNewestFirst(results));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the audit log. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, loading, error };
}
