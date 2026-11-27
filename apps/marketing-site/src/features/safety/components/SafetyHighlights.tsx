interface SafetyPoint {
  title: string;
  body: string;
}

const SAFETY_POINTS: SafetyPoint[] = [
  {
    title: "Blocking and reporting are always available",
    body:
      "Every user, including Free users, can block another user, report a " +
      "profile, report a photo, or report a message at any time. These " +
      "tools are never gated behind a paid plan.",
  },
  {
    title: "Reports are reviewed by our moderation team",
    body:
      "Reports are triaged and reviewed through a moderation process. " +
      "Access to the detail needed to investigate a report — including, " +
      "where necessary, the messages involved — is case-based, " +
      "permission-controlled and logged in an audit trail. Moderators do " +
      "not have standing, unrestricted access to private conversations.",
  },
  {
    title: "Violations can lead to suspension or a permanent ban",
    body:
      "Accounts that violate our Community Guidelines can be temporarily " +
      "suspended or permanently banned, depending on the severity and " +
      "pattern of the behaviour. Suspicious or abusive behaviour is " +
      "monitored on an ongoing basis, not only when someone reports it.",
  },
  {
    title: "Unmatch and hide-profile controls are always yours",
    body:
      "You can unmatch with anyone, or hide your profile from discovery, " +
      "without needing a reason and without it affecting your ability to " +
      "use the rest of the app.",
  },
  {
    title: "How to get help",
    body:
      "If you feel unsafe, or need help with a report, suspension appeal, " +
      "or anything else safety-related, use the in-app report/block flow " +
      "or reach our support team through the Contact page. We aim to " +
      "respond to safety reports as a priority.",
  },
];

/**
 * Plain-language summary of the platform's safety and moderation
 * commitments for the Safety information page.
 */
export function SafetyHighlights() {
  return (
    <section style={{ padding: "48px 24px", maxWidth: 720 }}>
      {SAFETY_POINTS.map((point) => (
        <div key={point.title} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>{point.title}</h2>
          <p style={{ color: "#374151", lineHeight: 1.6 }}>{point.body}</p>
        </div>
      ))}
    </section>
  );
}
