"use client";

import { useEffect, useRef, useState } from "react";
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
 *
 * Focus management: each step of this flow swaps the DOM elements a
 * keyboard user is focused on out from under them -
 * "Refund" -> confirm panel, confirm panel -> back to "Refund" (Cancel), or
 * confirm panel -> nothing at all (Confirm refund succeeds and the payment
 * is no longer refund-eligible). Left alone, every one of those swaps drops
 * focus to <body>, silently losing the keyboard user's place in the table.
 * The refs/effects below move focus explicitly at each transition instead.
 */
export function RefundAction({ payment, onRefund }: RefundActionProps) {
  const [confirming, setConfirming] = useState(false);
  const eligible = isRefundEligible(payment);

  const triggerWrapRef = useRef<HTMLSpanElement | null>(null);
  const panelWrapRef = useRef<HTMLDivElement | null>(null);
  const wasConfirmingRef = useRef(false);
  // The table row this action lives in. Captured via a ref callback (not
  // read off `triggerWrapRef`/`panelWrapRef` directly) because once the
  // action becomes ineligible it renders `null`, and by the time an effect
  // runs after that commit those refs already read back `null`. The `<tr>`
  // itself is owned by the shared `Table` component and never unmounts -
  // only this cell's contents change - so a reference captured here while
  // still mounted stays valid to focus afterwards.
  const rowRef = useRef<HTMLTableRowElement | null>(null);

  function captureRow(node: HTMLElement | null) {
    if (node) {
      const row = node.closest("tr");
      if (row) rowRef.current = row;
    }
  }

  useEffect(() => {
    if (confirming) {
      // Entering the confirm step: focus "Cancel" (the second button), not
      // "Confirm refund" - so a keyboard user who presses Enter/Space twice
      // out of habit can't accidentally re-trigger the destructive action.
      const buttons = panelWrapRef.current?.querySelectorAll("button");
      buttons?.[1]?.focus();
    } else if (wasConfirmingRef.current) {
      // Cancelled back out of the confirm step: return focus to "Refund"
      // rather than letting it fall through to <body>.
      triggerWrapRef.current?.querySelector("button")?.focus();
    }
    wasConfirmingRef.current = confirming;
  }, [confirming]);

  useEffect(() => {
    if (!eligible) {
      // The action just disappeared entirely (a refund succeeded and the
      // payment is no longer refund-eligible). Move focus to the row so
      // the keyboard user keeps their place instead of landing on <body>.
      const row = rowRef.current;
      if (row) {
        row.setAttribute("tabindex", "-1");
        row.focus();
      }
    }
    // Intentionally only reacts to `eligible` flipping, not every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible]);

  if (!eligible) {
    return null;
  }

  if (confirming) {
    return (
      <div
        ref={(node) => {
          panelWrapRef.current = node;
          captureRow(node);
        }}
        className="flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2"
      >
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
    <span
      ref={(node) => {
        triggerWrapRef.current = node;
        captureRow(node);
      }}
      className="inline-flex"
    >
      <Button variant="danger" onClick={() => setConfirming(true)}>
        Refund
      </Button>
    </span>
  );
}
