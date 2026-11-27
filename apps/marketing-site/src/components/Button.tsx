type ButtonVariant = "primary" | "secondary";

export interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white shadow-soft hover:bg-primary-600 hover:shadow-lg hover:-translate-y-0.5",
  secondary:
    "bg-white text-neutral-800 border border-neutral-200 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5",
};

/**
 * Shared call-to-action button/link used across marketing pages.
 */
export function Button({ children, href = "#", variant = "primary" }: ButtonProps) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </a>
  );
}
