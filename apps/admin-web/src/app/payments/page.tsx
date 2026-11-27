"use client";

import { StatusFilter } from "@/components/StatusFilter";
import { RequireAdminAuth } from "@/features/auth/components/RequireAdminAuth";
import { SubscriptionTable } from "@/features/payments/components/SubscriptionTable";
import { PaymentTable } from "@/features/payments/components/PaymentTable";
import { useSubscriptions } from "@/features/payments/hooks/useSubscriptions";
import { usePayments } from "@/features/payments/hooks/usePayments";
import { SubscriptionStatusFilter } from "@/features/payments/api/subscriptions.api";
import { PaymentStatusFilter } from "@/features/payments/api/payments.api";

const SUBSCRIPTION_STATUS_OPTIONS: Array<{ value: SubscriptionStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_STATUS_OPTIONS: Array<{ value: PaymentStatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "succeeded", label: "Succeeded" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

/**
 * Subscriptions/payments monitoring page: thin composition of the
 * payments feature's components. Read-only by design - this wave is
 * explicitly not about processing real payments, only visibility for the
 * admin team (no real Razorpay keys are wired this wave).
 */
export default function PaymentsPage() {
  const subscriptionsState = useSubscriptions();
  const paymentsState = usePayments();

  return (
    <RequireAdminAuth>
      <h1>Subscriptions & Payments</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>Subscriptions</h2>
        <StatusFilter
          value={subscriptionsState.statusFilter}
          options={SUBSCRIPTION_STATUS_OPTIONS}
          onChange={subscriptionsState.setStatusFilter}
        />
        {subscriptionsState.error && <p style={{ color: "#dc2626" }}>{subscriptionsState.error}</p>}
        <SubscriptionTable subscriptions={subscriptionsState.subscriptions} />
      </section>

      <section>
        <h2>Payments</h2>
        <StatusFilter
          value={paymentsState.statusFilter}
          options={PAYMENT_STATUS_OPTIONS}
          onChange={paymentsState.setStatusFilter}
        />
        {paymentsState.error && <p style={{ color: "#dc2626" }}>{paymentsState.error}</p>}
        <PaymentTable payments={paymentsState.payments} />
      </section>
    </RequireAdminAuth>
  );
}
