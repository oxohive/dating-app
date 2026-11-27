"use client";

import { Badge } from "@/components/Badge";
import { Table } from "@/components/Table";
import { Subscription } from "@/features/payments/api/subscriptions.api";

export interface SubscriptionTableProps {
  subscriptions: Subscription[];
}

const STATUS_TONE: Record<Subscription["status"], "success" | "neutral" | "danger"> = {
  active: "success",
  expired: "neutral",
  cancelled: "danger",
};

/**
 * Read-only table of subscriptions for the admin monitoring dashboard.
 */
export function SubscriptionTable({ subscriptions }: SubscriptionTableProps) {
  return (
    <Table<Subscription>
      rows={subscriptions}
      getRowKey={(subscription) => subscription.id}
      emptyMessage="No subscriptions match this filter."
      columns={[
        { key: "user", header: "User", render: (subscription) => subscription.userId },
        { key: "plan", header: "Plan", render: (subscription) => subscription.plan },
        {
          key: "status",
          header: "Status",
          render: (subscription) => <Badge tone={STATUS_TONE[subscription.status]}>{subscription.status}</Badge>,
        },
        {
          key: "expiresAt",
          header: "Expires at",
          render: (subscription) => new Date(subscription.expiresAt).toLocaleString(),
        },
      ]}
    />
  );
}
