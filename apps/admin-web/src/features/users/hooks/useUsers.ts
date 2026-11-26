"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminUser, searchUsers } from "@/features/users/api/users.api";

export interface UseUsersResult {
  users: AdminUser[];
  loading: boolean;
  query: string;
  setQuery: (query: string) => void;
}

/**
 * Loads and filters the admin user list for the user search feature.
 */
export function useUsers(): UseUsersResult {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (nextQuery: string) => {
    setLoading(true);
    try {
      const results = await searchUsers(nextQuery);
      setUsers(results);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query);
  }, [load, query]);

  return { users, loading, query, setQuery };
}
