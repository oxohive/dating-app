"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Flag,
  ShieldCheck,
  CreditCard,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { SidebarAuthAction } from "@/components/SidebarAuthAction";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/reports", label: "Reports", icon: Flag },
  { href: "/verification", label: "Verification", icon: ShieldCheck },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/audit", label: "Audit log", icon: ScrollText },
];

/**
 * Persistent left-hand navigation shell for the admin dashboard. Highlights
 * the active section based on the current route. Each page still gates its
 * own content behind `RequireAdminAuth`, so an unauthenticated admin can
 * still see the shell but will hit the sign-in gate when a gated page's
 * content renders. The footer auth action (`SidebarAuthAction`) reflects
 * real, reactive auth state from the shared auth store.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-none flex-col border-r border-primary-900/10 bg-primary-950 text-primary-100">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-600 text-sm font-bold text-white">
          A
        </div>
        <span className="text-sm font-semibold text-white">Dating App Admin</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-600 text-white"
                  : "text-primary-200 hover:bg-white/5 hover:text-white",
              ].join(" ")}
            >
              <Icon size={17} className={isActive ? "text-white" : "text-primary-400"} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-4">
        <SidebarAuthAction />
      </div>
    </aside>
  );
}
