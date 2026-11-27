import { DraftNotice } from "@/components/DraftNotice";

interface GuidelineSection {
  heading: string;
  body: string;
}

const SECTIONS: GuidelineSection[] = [
  {
    heading: "Be 18 or over, and be yourself",
    body:
      "Dating App is for adults 18 and over only. Use real, recent photos " +
      "of yourself and accurate profile information — no impersonation, " +
      "and no fake or misleading profiles.",
  },
  {
    heading: "Treat others with respect",
    body:
      "Harassment, hate speech, threats, and unwanted sexual content are " +
      "never okay, in messages, photos, or your profile.",
  },
  {
    heading: "No scams or solicitation",
    body:
      "Don't use the app to request money, promote other services or " +
      "social accounts for commercial purposes, or run any kind of scam.",
  },
  {
    heading: "Keep private conversations private",
    body:
      "Don't share someone else's messages, photos, or personal " +
      "information without their consent.",
  },
  {
    heading: "Report, don't retaliate",
    body:
      "If someone makes you uncomfortable or breaks these guidelines, " +
      "block and report them rather than engaging further. Reporting " +
      "tools are available to every user, free or paid.",
  },
  {
    heading: "What happens if you break these guidelines",
    body:
      "Depending on severity and whether it's a repeat issue, violations " +
      "can lead to content removal, a temporary suspension, or a " +
      "permanent ban. You can appeal a suspension or ban through our " +
      "Contact page.",
  },
];

/**
 * Structured placeholder Community Guidelines content.
 */
export function CommunityGuidelines() {
  return (
    <section style={{ padding: "48px 24px", maxWidth: 720 }}>
      <DraftNotice documentLabel="community guidelines" />
      {SECTIONS.map((section) => (
        <div key={section.heading} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>{section.heading}</h2>
          <p style={{ color: "#374151", lineHeight: 1.6 }}>{section.body}</p>
        </div>
      ))}
    </section>
  );
}
