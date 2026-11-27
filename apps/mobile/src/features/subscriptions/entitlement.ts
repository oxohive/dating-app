import type { MySubscription } from './api/subscriptions.api';

/**
 * Pure client-side mirror of the backend's `has_active_premium` check
 * (`tasks/0010-wave2-deferred-features/plan.md`), used wherever the mobile
 * app needs to decide whether to *show* Premium-gated UI (the radius
 * picker, the compatibility breakdown, etc). The backend remains the
 * source of truth/enforcement for every gated read or write — this only
 * controls what the UI offers, never what it trusts.
 */
export function isPremiumSubscription(subscription: MySubscription | null | undefined): boolean {
  return subscription?.status === 'active';
}
