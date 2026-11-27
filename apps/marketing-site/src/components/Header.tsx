"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, X } from "lucide-react";
import { HEADER_LINKS } from "@/components/navLinks";

/**
 * Shared site header with primary navigation.
 */
export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold text-neutral-900 transition-colors hover:text-primary-600"
        >
          <Heart className="h-6 w-6 fill-primary-500 text-primary-500" aria-hidden="true" />
          Dating App
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {HEADER_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary-600 ${
                  isActive ? "text-primary-600" : "text-neutral-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:block">
          <Link
            href="/pricing"
            className="inline-flex items-center rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:bg-primary-600 hover:shadow-lg"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="inline-flex items-center justify-center rounded-md p-2 text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMenuOpen && (
        <nav className="flex flex-col gap-1 border-t border-neutral-200 bg-white px-6 py-4 md:hidden">
          {HEADER_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary-50 text-primary-600"
                    : "text-neutral-600 hover:bg-neutral-50 hover:text-primary-600"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/pricing"
            onClick={() => setIsMenuOpen(false)}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-primary-600"
          >
            Get started
          </Link>
        </nav>
      )}
    </header>
  );
}
