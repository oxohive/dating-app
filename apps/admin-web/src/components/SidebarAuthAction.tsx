"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { useAuthStore } from "@/features/auth/store/authStore";

const ACTION_CLASSNAME =
  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-primary-200 transition-colors hover:bg-white/5 hover:text-white";

/**
 * Sidebar footer auth action. Reads `isAuthenticated` from the shared auth
 * store so it reflects real auth state reactively: a "Sign in" link when
 * signed out (unchanged from the original behavior), or a "Sign out"
 * button when signed in - there was previously no sign-out mechanism
 * anywhere in this app's UI.
 */
export function SidebarAuthAction() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAccessToken = useAuthStore((state) => state.clearAccessToken);

  if (isAuthenticated) {
    const handleSignOut = () => {
      clearAccessToken();
      router.push("/login");
    };

    return (
      <button type="button" onClick={handleSignOut} className={ACTION_CLASSNAME}>
        <LogOut size={17} className="text-primary-400" />
        Sign out
      </button>
    );
  }

  return (
    <Link href="/login" className={ACTION_CLASSNAME}>
      <LogIn size={17} className="text-primary-400" />
      Sign in
    </Link>
  );
}
