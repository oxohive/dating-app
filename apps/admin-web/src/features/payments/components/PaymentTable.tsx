"use client";

import { Badge } from "@/components/Badge";
import { Table } from "@/components/Table";
import { formatAmount, Payment } from "@/features/payments/api/payments.api";
import { RefundAction } from "@/features/payments/components/RefundAction";

export interface PaymentTableProps {
  payments: Payment[];
  onRefund: (paymentId: string) => void;
  loading?: boolean;
}

// Each payment status gets its own distinguishable badge tone - "refunded"
// is intentionally its own color (violet), not folded into neutral, so it
// reads as a distinct terminal state from "pending"/"succeeded"/"failed".
const STATUS_TONE: Record<Payment["status"], "success" | "warning" | "danger" | "refunded"> = {
  succeeded: "success",
  pending: "warning",
  failed: "danger",
  refunded: "refunded",
};

/**
 * Read-only table of payments for the admin monitoring dashboard. This
 * wave has no real Razorpay keys wired - it is visibility only, never a
 * payment-processing surface.
 */
export function PaymentTable({ payments, onRefund, loading = false }: PaymentTableProps) {
  return (
    <Table<Payment>
      rows={payments}
      getRowKey={(payment) => payment.id}
      emptyMessage="No payments match this filter."
      loading={loading}
      columns={[
        { key: "user", header: "User", render: (payment) => payment.userId },
        { key: "provider", header: "Provider", render: (payment) => <span className="text-slate-500">{payment.provider}</span> },
        {
          key: "amount",
          header: "Amount",
          render: (payment) => (
            <span className="font-medium text-slate-800">
              {formatAmount(payment.amountMinorUnits, payment.currency)}
            </span>
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (payment) => <Badge tone={STATUS_TONE[payment.status]}>{payment.status}</Badge>,
        },
        {
          key: "createdAt",
          header: "Created at",
          render: (payment) => <span className="text-slate-500">{new Date(payment.createdAt).toLocaleString()}</span>,
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
