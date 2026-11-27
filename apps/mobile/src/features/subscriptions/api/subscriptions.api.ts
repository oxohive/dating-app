import { ApiError, apiClient } from '../../../core/apiClient';

/**
 * Wave 2, subtask M3 — reconciled against the real backend contract
 * (`services/backend/packages/api/features/subscriptions/**`) during
 * `tasks/0010-wave2-deferred-features` integration. This module previously
 * documented several endpoint shapes as assumptions made before B4 landed;
 * those assumptions have now been checked against the real implementation
 * and corrected where they were wrong:
 *  - `GET /subscriptions/plans` — catalogue, real shape is
 *    `{ plans: [{ plan, label, duration_days, price_minor_units, currency }] }`.
 *    There is no `id`/`name` on the wire; `fetchPlanCatalogue` synthesizes
 *    `SubscriptionPlan.id`/`.name` from `plan`/`label` below so every other
 *    call site (`usePlanCatalogue`, `PlanOptionCard`, `PlansScreen`) keeps
 *    working against the same `SubscriptionPlan` shape unchanged.
 *  - `GET /subscriptions/me` — current user's subscription, 404 when the
 *    user has never subscribed (handled as `null` below). Confirmed to
 *    already match this client's existing shape — no change needed.
 *  - `POST /subscriptions/checkout-session` — `{ plan }` body, returns
 *    `{ order_id, session_id, amount_minor_units, currency, key_id, plan }`.
 *    `provider`/`sandbox` are NOT backend-reported fields — this wave's
 *    checkout is always sandboxed via a stub Razorpay client server-side
 *    (no real payment keys), so `createCheckoutSession` hardcodes
 *    `provider: 'razorpay'` / `sandbox: true` on the client instead.
 *  - `POST /subscriptions/checkout-session/{session_id}/sandbox-complete` —
 *    real endpoint, now confirmed to REQUIRE a `{ plan }` JSON body: the
 *    backend deliberately persists no "pending checkout" row server-side,
 *    so it cannot know which plan a given `session_id` was for without
 *    being told again.
 */

export type SubscriptionPlanId = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export type SubscriptionPlan = {
  id: string;
  plan: SubscriptionPlanId;
  name: string;
  priceMinorUnits: number;
  currency: string;
};

export type MySubscription = {
  id: string;
  plan: SubscriptionPlanId;
  status: SubscriptionStatus;
  startedAt: string;
  expiresAt: string | null;
};

export type CheckoutSession = {
  sessionId: string;
  provider: string;
  sandbox: boolean;
  amountMinorUnits: number;
  currency: string;
};

export type SubscriptionPlanApiResponse = {
  plan: SubscriptionPlanId;
  label: string;
  duration_days: number;
  price_minor_units: number;
  currency: string;
};

type MySubscriptionApiResponse = {
  id: string;
  plan: SubscriptionPlanId;
  status: SubscriptionStatus;
  started_at: string;
  expires_at: string | null;
};

type CheckoutSessionApiResponse = {
  order_id: string;
  session_id: string;
  amount_minor_units: number;
  currency: string;
  key_id: string;
  plan: SubscriptionPlanId;
};

/**
 * Maps one wire-shape plan into `SubscriptionPlan`. The backend has no
 * `id`/`name` field for a plan — only `plan` (the tier key) and `label`
 * (its display name) — so `.id`/`.name` are synthesized from those,
 * keeping every downstream consumer of `SubscriptionPlan` (which predates
 * this reconciliation) unchanged. Pulled out as a standalone function so
 * the synthesis is independently testable without mocking `apiClient`.
 */
export function mapSubscriptionPlan(plan: SubscriptionPlanApiResponse): SubscriptionPlan {
  return {
    id: plan.plan,
    plan: plan.plan,
    name: plan.label,
    priceMinorUnits: plan.price_minor_units,
    currency: plan.currency,
  };
}

/** `GET /subscriptions/plans` — the plan catalogue shown on the upsell screen. */
export async function fetchPlanCatalogue(): Promise<SubscriptionPlan[]> {
  const response = await apiClient.get<{ plans: SubscriptionPlanApiResponse[] }>('/subscriptions/plans');
  return response.plans.map(mapSubscriptionPlan);
}

/**
 * `GET /subscriptions/me` — the signed-in user's current subscription, or
 * `null` if they've never subscribed (assumed to 404 in that case, matching
 * the no-active-resource convention elsewhere in this backend).
 */
export async function fetchMySubscription(): Promise<MySubscription | null> {
  try {
    const response = await apiClient.get<MySubscriptionApiResponse>('/subscriptions/me');
    return {
      id: response.id,
      plan: response.plan,
      status: response.status,
      startedAt: response.started_at,
      expiresAt: response.expires_at,
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * `POST /subscriptions/checkout-session` — starts a (sandboxed) checkout
 * for the given plan. `provider`/`sandbox` aren't backend-reported fields
 * (there's no real payment provider wired this wave — see the module note
 * above), so they're hardcoded here rather than read off the response.
 */
export async function createCheckoutSession(plan: SubscriptionPlanId): Promise<CheckoutSession> {
  const response = await apiClient.post<CheckoutSessionApiResponse>('/subscriptions/checkout-session', { plan });
  return {
    sessionId: response.session_id,
    provider: 'razorpay',
    sandbox: true,
    amountMinorUnits: response.amount_minor_units,
    currency: response.currency,
  };
}

/**
 * Request body for the sandbox-complete call. Pulled out as a standalone
 * function (rather than an inline literal) so the "requires `plan`" shape
 * is independently testable without mocking `apiClient`.
 */
export function buildSandboxCompleteBody(plan: SubscriptionPlanId): { plan: SubscriptionPlanId } {
  return { plan };
}

/**
 * Sandbox-only "simulate payment" step. Requires `plan` in the body: the
 * backend deliberately persists no "pending checkout" row server-side, so
 * it cannot know which plan a given `session_id` was for without being
 * told again here.
 */
export async function completeSandboxCheckout(sessionId: string, plan: SubscriptionPlanId): Promise<void> {
  await apiClient.post<void>(`/subscriptions/checkout-session/${sessionId}/sandbox-complete`, buildSandboxCompleteBody(plan));
}
