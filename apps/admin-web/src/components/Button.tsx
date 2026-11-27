type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  type?: "button" | "submit";
  disabled?: boolean;
}

// Clear visual hierarchy: primary (solid brand) for the main action,
// secondary (quiet outline) for low-stakes actions like "cancel", and
// danger (solid red, slightly heavier shadow) for destructive actions like
// refund/suspend so they visibly read as consequential.
const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-400 shadow-sm",
  secondary:
    "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-300",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-400 shadow-sm",
};

/**
 * Shared primitive button used across all admin features.
 */
export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        VARIANT_STYLES[variant],
      ].join(" ")}
    >
      {children}
    </button>
  );
}
