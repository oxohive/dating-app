"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminUser, searchUsers } from "@/features/users/api/users.api";
import { ApiError } from "@/lib/apiClient";

export interface UseUsersResult {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  query: string;
  setQuery: (query: string) => void;
  markSuspended: (userId: string) => void;
}

/**
 * Loads the admin user search results for the given query and exposes a
 * local-state update so the table/detail panel can reflect a suspend
 * action immediately without waiting on a re-search.
 */
export function useUsers(): UseUsersResult {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await searchUsers(nextQuery);
      setUsers(results);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query);
  }, [load, query]);

  const markSuspended = useCallback((userId: string) => {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, status: "suspended" } : user)));
  }, []);

  return { users, loading, error, query, setQuery, markSuspended };
}
