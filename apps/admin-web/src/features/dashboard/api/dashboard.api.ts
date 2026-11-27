import { apiClient } from "@/lib/apiClient";

export interface RegistrationsByDay {
  date: string;
  count: number;
}

export interface CityBreakdown {
  city: string;
  count: number;
}

export interface DashboardAnalytics {
  totalUsers: number;
  totalProfiles: number;
  activePremiumCount: number;
  totalLikes: number;
  totalMatches: number;
  totalMessages: number;
  registrationsByDay: RegistrationsByDay[];
  usersByCity: CityBreakdown[];
}

/**
 * ASSUMED shape of the admin analytics summary response from subtask B2
 * (`services/backend/packages/api/features/admin/**`, not yet landed as of
 * this write - this subtask was built in parallel against plan.md's
 * contract, same "ASSUMED ... not yet landed" convention already used by
 * `subscriptions.api.ts`/`payments.api.ts` for their own parallel backend
 * subtasks). Matches plan.md section 2's scope exactly: total users, total
 * completed profiles, registrations-by-day for the last 30 days
 * (`User.created_at` grouped by date), users-by-city (`Profile.city`
 * grouped), total likes/matches/messages, and the active-Premium-subscriber
 * count (a single aggregate query - `Subscription.status == "active" AND
 * expires_at > now()` - never a per-user loop, per plan.md). Field names
 * follow this feature's existing snake_case-from-backend convention (see
 * `AdminAuditLogOut` in `schemas.py`). Reconcile at integration if the real
 * shape differs.
 */
interface DashboardAnalyticsApiModel {
  total_users: number;
  total_profiles: number;
  active_premium_count: number;
  total_likes: number;
  total_matches: number;
  total_messages: number;
  registrations_by_day: Array<{ day: string; count: number }>;
  users_by_city: Array<{ city: string; count: number }>;
}

export function mapDashboardAnalytics(raw: DashboardAnalyticsApiModel): DashboardAnalytics {
  return {
    totalUsers: raw.total_users,
    totalProfiles: raw.total_profiles,
    activePremiumCount: raw.active_premium_count,
    totalLikes: raw.total_likes,
    totalMatches: raw.total_matches,
    totalMessages: raw.total_messages,
    registrationsByDay: raw.registrations_by_day.map((entry) => ({
      date: entry.day,
      count: entry.count,
    })),
    usersByCity: raw.users_by_city.map((entry) => ({
      city: entry.city,
      count: entry.count,
    })),
  };
}

/**
 * Fetches the admin analytics summary. `GET /admin/analytics` -> 200
 * (requires `is_admin`, same `require_admin` dependency as every other
 * admin endpoint).
 */
export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const raw = await apiClient.get<DashboardAnalyticsApiModel>("/admin/analytics");
  return mapDashboardAnalytics(raw);
}
