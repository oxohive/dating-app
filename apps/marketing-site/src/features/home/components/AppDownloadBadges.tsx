interface StoreBadge {
  store: string;
  note: string;
}

const STORE_BADGES: StoreBadge[] = [
  { store: "App Store", note: "Coming soon" },
  { store: "Google Play", note: "Coming soon" },
];

/**
 * Placeholder app store download badges.
 *
 * There are no live App Store / Play Store listings yet (we're in the
 * Chennai pilot), so these are intentionally non-functional placeholders
 * rather than links to a real or fake store page.
 */
export function AppDownloadBadges() {
  return (
    <section style={{ padding: "0 24px 48px", textAlign: "center" }}>
      <p style={{ color: "#6b7280", marginBottom: 16 }}>
        We&apos;re in the Chennai pilot, so Dating App isn&apos;t on the
        public app stores just yet. Badges below will go live at launch.
      </p>
      <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
        {STORE_BADGES.map((badge) => (
          <div
            key={badge.store}
            aria-disabled="true"
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "12px 20px",
              color: "#9ca3af",
              minWidth: 160,
            }}
          >
            <strong style={{ display: "block", color: "#374151" }}>{badge.store}</strong>
            <span style={{ fontSize: 13 }}>{badge.note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
