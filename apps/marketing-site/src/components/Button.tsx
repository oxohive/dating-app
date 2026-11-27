type ButtonVariant = "primary" | "secondary";

export interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-500 text-white shadow-soft hover:bg-primary-600 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:bg-primary-700 active:shadow-soft focus-visible:outline-primary-400",
  secondary:
    "bg-white text-neutral-800 border border-neutral-200 hover:border-primary-300 hover:text-primary-600 hover:-translate-y-0.5 active:translate-y-0 active:border-primary-400 focus-visible:outline-primary-300",
};

/**
 * Shared call-to-action button/link used across marketing pages.
 *
 * Focus uses the `outline` property rather than Tailwind's box-shadow-based
 * `ring-*` utilities: the primary variant also sets `shadow-soft`, and both
 * `shadow-soft` and `ring-*` compile to a plain `box-shadow` declaration, so
 * whichever rule happens to come later wins and silently drops the other —
 * `outline` is a separate CSS property and can't collide with `box-shadow`.
 */
export function Button({ children, href = "#", variant = "primary" }: ButtonProps) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </a>
  );
}
