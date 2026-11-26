import Link from "next/link";

/**
 * Shared site header with primary navigation.
 */
export function Header() {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}>
      <strong>Dating App</strong>
      <nav style={{ display: "flex", gap: 16 }}>
        <Link href="/">Home</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/faq">FAQ</Link>
      </nav>
    </header>
  );
}
