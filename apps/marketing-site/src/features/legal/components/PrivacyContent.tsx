import { DraftNotice } from "@/components/DraftNotice";

interface PrivacySection {
  heading: string;
  body: string;
}

const SECTIONS: PrivacySection[] = [
  {
    heading: "What we collect",
    body:
      "Account details (such as phone number and email), profile " +
      "information and photos, approximate location (for discovery and " +
      "matching), messages you send through the app, verification " +
      "information, and payment history for subscriptions.",
  },
  {
    heading: "How we use your data",
    body:
      "To show you to compatible people nearby, power matching and " +
      "messaging, verify accounts, process payments, keep the platform " +
      "safe (including investigating reports), and send the notifications " +
      "you've opted into.",
  },
  {
    heading: "Location",
    body:
      "We use your approximate location to power discovery. We do not " +
      "expose your precise location to other users. Location access is " +
      "based on your consent, which you can withdraw through your " +
      "device's permission settings — discovery accuracy may be reduced " +
      "if you do.",
  },
  {
    heading: "We do not sell your personal data",
    body:
      "We do not sell your personal information or dating activity to " +
      "third parties.",
  },
  {
    heading: "Who can see what",
    body:
      "Your profile is visible to other users as part of discovery. " +
      "Private conversations are not open to our team by default — access " +
      "for a safety investigation is case-based, permission-controlled, " +
      "and logged in an audit trail.",
  },
  {
    heading: "Data retention and deletion",
    body:
      "We retain your data for as long as your account is active, plus a " +
      "limited period for safety and legal purposes. You can request " +
      "deletion of your account and associated personal data at any time " +
      "— see our Account Deletion page.",
  },
  {
    heading: "Access and correction",
    body:
      "You can review and correct most of your profile information " +
      "directly in the app. For anything else — including a copy of the " +
      "data we hold about you — contact us through the Contact page.",
  },
  {
    heading: "Security incidents",
    body:
      "If we become aware of a security incident affecting your personal " +
      "data, we will take reasonable steps to investigate, contain it, " +
      "and notify affected users and relevant authorities as required by " +
      "law.",
  },
  {
    heading: "Legal basis and framework",
    body:
      "We intend to handle personal data in line with India's Digital " +
      "Personal Data Protection framework and applicable DPDP Rules. This " +
      "policy will be updated as our compliance review progresses toward " +
      "launch.",
  },
  {
    heading: "Grievance and contact",
    body:
      "For privacy questions, data requests, or complaints, reach us " +
      "through our Contact page.",
  },
];

/**
 * Structured placeholder Privacy Policy content.
 */
export function PrivacyContent() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <DraftNotice documentLabel="privacy policy" />
      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.heading} className="border-b border-neutral-200 pb-6 last:border-0">
            <h2 className="font-display text-lg font-semibold text-neutral-900">
              {section.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">{section.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
