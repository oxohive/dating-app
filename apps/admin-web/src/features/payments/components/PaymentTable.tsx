"use client";

import { Badge } from "@/components/Badge";
import { Table } from "@/components/Table";
import { formatAmount, Payment } from "@/features/payments/api/payments.api";
import { RefundAction } from "@/features/payments/components/RefundAction";

export interface PaymentTableProps {
  payments: Payment[];
  onRefund: (paymentId: string) => void;
}

const STATUS_TONE: Record<Payment["status"], "success" | "warning" | "danger" | "neutral"> = {
  succeeded: "success",
  pending: "warning",
  failed: "danger",
  refunded: "neutral",
};

/**
 * Read-only table of payments for the admin monitoring dashboard. This
 * wave has no real Razorpay keys wired - it is visibility only, never a
 * payment-processing surface.
 */
export function PaymentTable({ payments, onRefund }: PaymentTableProps) {
  return (
    <Table<Payment>
      rows={payments}
      getRowKey={(payment) => payment.id}
      emptyMessage="No payments match this filter."
      columns={[
        { key: "user", header: "User", render: (payment) => payment.userId },
        { key: "provider", header: "Provider", render: (payment) => payment.provider },
        {
          key: "amount",
          header: "Amount",
          render: (payment) => formatAmount(payment.amountMinorUnits, payment.currency),
        },
        {
          key: "status",
          header: "Status",
          render: (payment) => <Badge tone={STATUS_TONE[payment.status]}>{payment.status}</Badge>,
        },
        {
          key: "createdAt",
          header: "Created at",
          render: (payment) => new Date(payment.createdAt).toLocaleString(),
        },
        {
          key: "actions",
          header: "Action",
          render: (payment) => <RefundAction payment={payment} onRefund={onRefund} />,
        },
      ]}
    />
  );
}
