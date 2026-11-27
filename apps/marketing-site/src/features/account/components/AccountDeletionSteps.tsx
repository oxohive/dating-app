import { Settings, Mail, ShieldCheck, Trash2, AlertCircle, type LucideIcon } from "lucide-react";

interface DeletionStep {
  title: string;
  body: string;
  icon: LucideIcon;
}

const STEPS: DeletionStep[] = [
  {
    title: "1. Open the app and go to your profile settings",
    body:
      "In the app, go to Profile and look for a Settings or Account " +
      "section. If you see a \"Delete Account\" option there, you can " +
      "start the deletion flow directly from the app.",
    icon: Settings,
  },
  {
    title: "2. Or request deletion from us directly",
    body:
      "Not every app version has in-app self-service deletion yet. " +
      "If you don't see the option, email us from your registered " +
      "phone number or email through the Contact page with the subject " +
      "\"Delete my account\", and we'll process the request manually.",
    icon: Mail,
  },
  {
    title: "3. Confirm it's really you",
    body:
      "We may ask you to confirm your identity (for example, by " +
      "verifying the phone number or email on the account) before " +
      "deleting it, so that no one else can delete your account on " +
      "your behalf.",
    icon: ShieldCheck,
  },
  {
    title: "4. What gets deleted",
    body:
      "Deleting your account removes your profile, photos, matches, and " +
      "messages from active use. Some information may be retained for a " +
      "limited period where we're required to for safety, fraud " +
      "prevention, or legal/regulatory reasons, after which it is " +
      "deleted or anonymised.",
    icon: Trash2,
  },
  {
    title: "5. This can't be undone",
    body:
      "Once your account is deleted, your profile and conversation " +
      "history can't be restored. If you just want a break, consider " +
      "hiding your profile instead — it's reversible and keeps your data " +
      "intact.",
    icon: AlertCircle,
  },
];

/**
 * Plain, step-by-step account deletion instructions.
 */
export function AccountDeletionSteps() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <div className="space-y-5">
        {STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="flex gap-5 rounded-xl2 border border-neutral-200 bg-white p-6 shadow-card transition-shadow hover:shadow-soft"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-neutral-900">
                  {step.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
