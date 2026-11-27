"use client";

import { Crown, Heart, HeartHandshake, LayoutDashboard, MessagesSquare, UserCheck, Users } from "lucide-react";
import { RequireAdminAuth } from "@/features/auth/components/RequireAdminAuth";
import { StatTile } from "@/features/dashboard/components/StatTile";
import { RegistrationsByDayTable } from "@/features/dashboard/components/RegistrationsByDayTable";
import { CityBreakdownTable } from "@/features/dashboard/components/CityBreakdownTable";
import { useDashboardAnalytics } from "@/features/dashboard/hooks/useDashboardAnalytics";

/**
 * Admin home page: real analytics dashboard, replacing the stale
 * "quick links" stub (the two links it pointed at, `/users` and
 * `/reports`, are already reachable via the sidebar nav, same as the
 * other 4 admin tools - this page's own content should be the one thing
 * only it offers: platform-wide stats). Thin composition of the
 * dashboard feature's hook/components, same pattern as every other
 * admin-web page.
 */
export default function HomePage() {
  const { analytics, loading, error } = useDashboardAnalytics();

  return (
    <RequireAdminAuth>
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <LayoutDashboard size={22} className="text-primary-600" />
        Admin Dashboard
      </h1>
      <p className="mb-6 text-sm text-slate-500">Platform stats at a glance.</p>

      {error && <p className="mb-4 text-sm font-medium text-rose-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Total users" value={analytics?.totalUsers ?? 0} icon={Users} loading={loading} />
        <StatTile label="Total profiles" value={analytics?.totalProfiles ?? 0} icon={UserCheck} loading={loading} />
        <StatTile label="Active Premium" value={analytics?.activePremiumCount ?? 0} icon={Crown} loading={loading} />
        <StatTile label="Total likes" value={analytics?.totalLikes ?? 0} icon={Heart} loading={loading} />
        <StatTile label="Total matches" value={analytics?.totalMatches ?? 0} icon={HeartHandshake} loading={loading} />
        <StatTile label="Total messages" value={analytics?.totalMessages ?? 0} icon={MessagesSquare} loading={loading} />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Registrations (last 30 days)</h2>
          <RegistrationsByDayTable entries={analytics?.registrationsByDay ?? []} loading={loading} />
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Users by city</h2>
          <CityBreakdownTable entries={analytics?.usersByCity ?? []} loading={loading} />
        </section>
      </div>
    </RequireAdminAuth>
  );
}
