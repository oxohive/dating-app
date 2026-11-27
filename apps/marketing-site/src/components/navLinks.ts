export interface NavLink {
  href: string;
  label: string;
}

/**
 * Primary navigation shown in the header. Kept short on purpose — see
 * FOOTER_LINKS for the rest of the site's pages.
 */
export const HEADER_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/safety", label: "Safety" },
];

/**
 * Secondary/legal/support navigation shown in the footer.
 */
export const FOOTER_LINKS: NavLink[] = [
  { href: "/contact", label: "Contact" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/community-guidelines", label: "Community Guidelines" },
  { href: "/account-deletion", label: "Delete My Account" },
];
