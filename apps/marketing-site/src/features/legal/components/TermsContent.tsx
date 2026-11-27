import { DraftNotice } from "@/components/DraftNotice";

interface TermsSection {
  heading: string;
  body: string;
}

const SECTIONS: TermsSection[] = [
  {
    heading: "1. Eligibility",
    body:
      "You must be at least 18 years old to create an account or use Dating " +
      "App. We may ask you to verify your age or identity, and we may " +
      "suspend or remove accounts we believe belong to someone under 18.",
  },
  {
    heading: "2. Your account",
    body:
      "You're responsible for the accuracy of the information on your " +
      "profile and for keeping your login credentials secure. You agree " +
      "not to impersonate anyone else or misrepresent your identity, age, " +
      "or intentions.",
  },
  {
    heading: "3. Acceptable use",
    body:
      "Harassment, hate speech, solicitation, scams, sharing someone " +
      "else's private information, and any behaviour prohibited by our " +
      "Community Guidelines are not allowed. We may investigate reports, " +
      "and may suspend or permanently ban accounts that violate these " +
      "terms.",
  },
  {
    heading: "4. Subscriptions and payments",
    body:
      "Paid plans (such as Plus or Premium) renew automatically unless " +
      "cancelled before the renewal date. Pricing is shown on our Pricing " +
      "page before you subscribe. Refunds are handled case-by-case through " +
      "our support team.",
  },
  {
    heading: "5. Safety is a shared responsibility",
    body:
      "We provide blocking, reporting, and moderation tools to every " +
      "user, but we cannot guarantee the conduct of other users. Meet " +
      "people safely, and use the in-app reporting tools if something " +
      "feels wrong.",
  },
  {
    heading: "6. Termination",
    body:
      "You may delete your account at any time (see our Account Deletion " +
      "page). We may suspend or terminate accounts that violate these " +
      "terms or our Community Guidelines.",
  },
  {
    heading: "7. Limitation of liability",
    body:
      "Dating App is provided \"as is\". To the extent permitted by law, " +
      "we are not liable for interactions between users that occur outside " +
      "the app, including in-person meetings.",
  },
  {
    heading: "8. Governing law",
    body:
      "These terms are intended to be governed by the laws of India. " +
      "Nothing here limits any statutory rights you have under Indian " +
      "law, including the Digital Personal Data Protection framework.",
  },
  {
    heading: "9. Changes to these terms",
    body:
      "We may update these terms as the product evolves, especially ahead " +
      "of a full public launch. We'll make a reasonable effort to let you " +
      "know about material changes.",
  },
  {
    heading: "10. Contact",
    body:
      "Questions about these terms can be sent through our Contact page.",
  },
];

/**
 * Structured placeholder Terms and Conditions content.
 */
export function TermsContent() {
  return (
    <section style={{ padding: "48px 24px", maxWidth: 720 }}>
      <DraftNotice documentLabel="terms and conditions" />
      {SECTIONS.map((section) => (
        <div key={section.heading} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>{section.heading}</h2>
          <p style={{ color: "#374151", lineHeight: 1.6 }}>{section.body}</p>
        </div>
      ))}
    </section>
  );
}
