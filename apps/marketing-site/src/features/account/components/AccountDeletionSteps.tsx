interface DeletionStep {
  title: string;
  body: string;
}

const STEPS: DeletionStep[] = [
  {
    title: "1. Open the app and go to your profile settings",
    body:
      "In the app, go to Profile and look for a Settings or Account " +
      "section. If you see a \"Delete Account\" option there, you can " +
      "start the deletion flow directly from the app.",
  },
  {
    title: "2. Or request deletion from us directly",
    body:
      "Not every app version has in-app self-service deletion yet. " +
      "If you don't see the option, email us from your registered " +
      "phone number or email through the Contact page with the subject " +
      "\"Delete my account\", and we'll process the request manually.",
  },
  {
    title: "3. Confirm it's really you",
    body:
      "We may ask you to confirm your identity (for example, by " +
      "verifying the phone number or email on the account) before " +
      "deleting it, so that no one else can delete your account on " +
      "your behalf.",
  },
  {
    title: "4. What gets deleted",
    body:
      "Deleting your account removes your profile, photos, matches, and " +
      "messages from active use. Some information may be retained for a " +
      "limited period where we're required to for safety, fraud " +
      "prevention, or legal/regulatory reasons, after which it is " +
      "deleted or anonymised.",
  },
  {
    title: "5. This can't be undone",
    body:
      "Once your account is deleted, your profile and conversation " +
      "history can't be restored. If you just want a break, consider " +
      "hiding your profile instead — it's reversible and keeps your data " +
      "intact.",
  },
];

/**
 * Plain, step-by-step account deletion instructions.
 */
export function AccountDeletionSteps() {
  return (
    <section style={{ padding: "48px 24px", maxWidth: 720 }}>
      {STEPS.map((step) => (
        <div key={step.title} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>{step.title}</h2>
          <p style={{ color: "#374151", lineHeight: 1.6 }}>{step.body}</p>
        </div>
      ))}
    </section>
  );
}
