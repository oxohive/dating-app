import { CheckCircle2, Circle, Clock, RotateCcw, XCircle } from "lucide-react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "refunded";

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
}

// Each status tone gets its own color pairing AND its own icon, so status
// states (pending/approved/rejected/refunded, etc.) stay distinguishable at
// a glance even for someone scanning quickly or who is color-blind.
const TONE_STYLES: Record<BadgeTone, { className: string; Icon: typeof Circle }> = {
  neutral: { className: "bg-slate-200 text-slate-700", Icon: Circle },
  success: { className: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  warning: { className: "bg-amber-100 text-amber-800", Icon: Clock },
  danger: { className: "bg-rose-100 text-rose-700", Icon: XCircle },
  refunded: { className: "bg-violet-100 text-violet-700", Icon: RotateCcw },
};

/**
 * Shared primitive badge used for status pills (user status, report status,
 * payment/subscription/verification status).
 */
export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const { className, Icon } = TONE_STYLES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${className}`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {children}
    </span>
  );
}
