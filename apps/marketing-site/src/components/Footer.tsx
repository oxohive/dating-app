import Link from "next/link";
import { Heart } from "lucide-react";
import { FOOTER_LINKS } from "@/components/navLinks";

/**
 * Shared site footer with legal/support navigation.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center gap-2 font-display text-base font-bold text-neutral-800">
          <Heart className="h-5 w-5 fill-primary-500 text-primary-500" aria-hidden="true" />
          Dating App
        </div>

        <nav className="mb-8 flex flex-wrap gap-x-8 gap-y-3">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md text-sm font-medium text-neutral-600 transition-colors hover:text-primary-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="border-t border-neutral-200 pt-6 text-sm text-neutral-600">
          &copy; {new Date().getFullYear()} Dating App. Chennai pilot.
        </p>
      </div>
    </footer>
  );
}
