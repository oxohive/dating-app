"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAccessToken } from "@/lib/authToken";

export interface RequireAdminAuthProps {
  children: React.ReactNode;
}

/**
 * Gates a page behind the presence of a stored admin access token. This is
 * a client-side convenience only - the backend's `is_admin` check on each
 * endpoint is what actually enforces access; a signed-in non-admin will
 * simply get 403s from the API once past this check.
 */
export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    setHasToken(getAccessToken() !== null);
  }, []);

  if (hasToken === null) {
    return null;
  }

  if (!hasToken) {
    return (
      <p>
        You need to <Link href="/login">sign in</Link> to view this page.
      </p>
    );
  }

  return <>{children}</>;
}
