import { apiClient } from "@/lib/apiClient";

export type SubscriptionStatus = "active" | "expired" | "cancelled";
export type SubscriptionStatusFilter = SubscriptionStatus | "all";

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * ASSUMED shape of `SubscriptionAdminOut` from subtask B4
 * (`services/backend/packages/api/features/subscriptions/**`, not yet
 * landed as of this write). Matches the `subscriptions` table exactly as
 * specified in plan.md: id, user_id FK `users.id`, plan
 * (daily|weekly|monthly|quarterly|annual), status
 * (active|expired|cancelled), started_at, expires_at, created_at. There is
 * no denormalized user display name on this table, so (same caveat as
 * `reports.api.ts`'s `reportedUserName`) this view falls back to showing
 * the raw user id until a later wave joins that in.
 */
interface SubscriptionAdminApiModel {
  id: string;
  user_id: string;
  plan: string;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string;
  created_at: string;
}

export function mapSubscription(raw: SubscriptionAdminApiModel): Subscription {
  return {
    id: raw.id,
    userId: raw.user_id,
    plan: raw.plan,
    status: raw.status,
    startedAt: raw.started_at,
    expiresAt: raw.expires_at,
    createdAt: raw.created_at,
  };
}

/**
 * Builds the list path for a given status filter. Extracted as a pure
 * function so the filtering behavior is directly unit-testable without
 * mocking `fetch` - same spirit as `src/lib/filterUsersByName.ts`.
 */
export function buildSubscriptionsQuery(filter: SubscriptionStatusFilter): string {
  if (filter === "all") {
    return "/admin/subscriptions";
  }
  return `/admin/subscriptions?status=${encodeURIComponent(filter)}`;
}

/**
 * Lists subscriptions, optionally filtered by status.
 * ASSUMED endpoint (mirrors `reports.api.ts`'s
 * `GET /admin/reports?status=` convention): `GET /admin/subscriptions`
 * (all) or `GET /admin/subscriptions?status=active|expired|cancelled`
 * -> 200 list (requires is_admin). This is a read-only monitoring view -
 * no checkout/entitlement endpoints are called from admin-web this wave.
 */
export async function listSubscriptions(filter: SubscriptionStatusFilter = "all"): Promise<Subscription[]> {
  const results = await apiClient.get<SubscriptionAdminApiModel[]>(buildSubscriptionsQuery(filter));
  return results.map(mapSubscription);
}
