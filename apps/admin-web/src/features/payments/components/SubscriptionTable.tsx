"use client";

import { Badge } from "@/components/Badge";
import { Table } from "@/components/Table";
import { Subscription } from "@/features/payments/api/subscriptions.api";

export interface SubscriptionTableProps {
  subscriptions: Subscription[];
  loading?: boolean;
}

const STATUS_TONE: Record<Subscription["status"], "success" | "neutral" | "danger"> = {
  active: "success",
  expired: "neutral",
  cancelled: "danger",
};

/**
 * Read-only table of subscriptions for the admin monitoring dashboard.
 */
export function SubscriptionTable({ subscriptions, loading = false }: SubscriptionTableProps) {
  return (
    <Table<Subscription>
      rows={subscriptions}
      getRowKey={(subscription) => subscription.id}
      emptyMessage="No subscriptions match this filter."
      loading={loading}
      columns={[
        { key: "user", header: "User", render: (subscription) => subscription.userId },
        { key: "plan", header: "Plan", render: (subscription) => <span className="font-medium text-slate-800">{subscription.plan}</span> },
        {
          key: "status",
          header: "Status",
          render: (subscription) => <Badge tone={STATUS_TONE[subscription.status]}>{subscription.status}</Badge>,
        },
        {
          key: "expiresAt",
          header: "Expires at",
          render: (subscription) => <span className="text-slate-500">{new Date(subscription.expiresAt).toLocaleString()}</span>,
        },
      ]}
    />
  );
}
