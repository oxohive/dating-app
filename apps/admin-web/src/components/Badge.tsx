type BadgeTone = "neutral" | "success" | "warning" | "danger";

export interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
}

const TONE_STYLES: Record<BadgeTone, React.CSSProperties> = {
  neutral: { background: "#e5e7eb", color: "#111827" },
  success: { background: "#dcfce7", color: "#166534" },
  warning: { background: "#fef9c3", color: "#854d0e" },
  danger: { background: "#fee2e2", color: "#991b1b" },
};

/**
 * Shared primitive badge used for status pills (user status, report status).
 */
export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        ...TONE_STYLES[tone],
      }}
    >
      {children}
    </span>
  );
}
