import Link from "next/link";
import { FOOTER_LINKS } from "@/components/navLinks";

/**
 * Shared site footer with legal/support navigation.
 */
export function Footer() {
  return (
    <footer style={{ padding: "24px", borderTop: "1px solid #e5e7eb", marginTop: 48, color: "#6b7280" }}>
      <nav style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        {FOOTER_LINKS.map((link) => (
          <Link key={link.href} href={link.href} style={{ color: "#6b7280" }}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p>&copy; {new Date().getFullYear()} Dating App. Chennai pilot.</p>
    </footer>
  );
}
