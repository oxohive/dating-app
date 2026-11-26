type ButtonVariant = "primary" | "secondary";

export interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: ButtonVariant;
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: "#db2777", color: "#fff" },
  secondary: { background: "#f3f4f6", color: "#111827" },
};

/**
 * Shared call-to-action button/link used across marketing pages.
 */
export function Button({ children, href = "#", variant = "primary" }: ButtonProps) {
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        padding: "10px 20px",
        borderRadius: 6,
        textDecoration: "none",
        fontWeight: 600,
        ...VARIANT_STYLES[variant],
      }}
    >
      {children}
    </a>
  );
}
