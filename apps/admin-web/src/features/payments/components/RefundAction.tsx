"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/Button";
import { Payment } from "@/features/payments/api/payments.api";
import { isRefundEligible } from "@/features/payments/lib/isRefundEligible";

export interface RefundActionProps {
  payment: Payment;
  onRefund: (paymentId: string) => void;
}

/**
 * Refund action for a single payment row. Hidden entirely for a payment
 * that is not refund-eligible (`isRefundEligible`) - already-refunded rows
 * get no action at all, same convention as `VerificationQueue` showing no
 * action for an already-reviewed row.
 *
 * Refunding is a real, consequential admin action, so this never fires on
 * a single click: the first click only arms a confirmation step ("Confirm
 * refund?" / "Cancel"), rendered as a visually distinct danger panel so
 * the second click reads as deliberate. The backend independently
 * re-enforces eligibility server-side regardless of this client-side gate.
 */
export function RefundAction({ payment, onRefund }: RefundActionProps) {
  const [confirming, setConfirming] = useState(false);

  if (!isRefundEligible(payment)) {
    return null;
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2">
        <TriangleAlert size={15} className="flex-none text-rose-600" />
        <span className="text-sm font-medium text-rose-700">Refund this payment?</span>
        <Button
          variant="danger"
          onClick={() => {
            setConfirming(false);
            onRefund(payment.id);
          }}
        >
          Confirm refund
        </Button>
        <Button variant="secondary" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button variant="danger" onClick={() => setConfirming(true)}>
      Refund
    </Button>
  );
}
