import Link from "next/link";
import { HEADER_LINKS } from "@/components/navLinks";

/**
 * Shared site header with primary navigation.
 */
export function Header() {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
      <strong>Dating App</strong>
      <nav style={{ display: "flex", gap: 16 }}>
        {HEADER_LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
