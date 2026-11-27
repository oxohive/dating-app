"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";

export interface RequireAdminAuthProps {
  children: React.ReactNode;
}

/**
 * Gates a page behind the presence of a stored admin access token. This is
 * a client-side convenience only - the backend's `is_admin` check on each
 * endpoint is what actually enforces access; a signed-in non-admin will
 * simply get 403s from the API once past this check.
 *
 * Reads `isAuthenticated` from the shared auth store (reactive, hydrated
 * from `localStorage` at module load) instead of taking its own fresh
 * `localStorage` read - the gating condition itself (token present vs. not)
 * is unchanged, only its source is.
 */
export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-white px-8 py-16 text-center shadow-card">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <LockKeyhole size={22} className="text-primary-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Sign in required</h2>
          <p className="mt-1 text-sm text-slate-500">You need to sign in to view this page.</p>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
