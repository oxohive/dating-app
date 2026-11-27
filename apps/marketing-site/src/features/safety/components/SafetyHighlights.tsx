import { ShieldCheck, Flag, Ban, EyeOff, LifeBuoy, type LucideIcon } from "lucide-react";

interface SafetyPoint {
  title: string;
  body: string;
  icon: LucideIcon;
}

const SAFETY_POINTS: SafetyPoint[] = [
  {
    title: "Blocking and reporting are always available",
    body:
      "Every user, including Free users, can block another user, report a " +
      "profile, report a photo, or report a message at any time. These " +
      "tools are never gated behind a paid plan.",
    icon: Flag,
  },
  {
    title: "Reports are reviewed by our moderation team",
    body:
      "Reports are triaged and reviewed through a moderation process. " +
      "Access to the detail needed to investigate a report — including, " +
      "where necessary, the messages involved — is case-based, " +
      "permission-controlled and logged in an audit trail. Moderators do " +
      "not have standing, unrestricted access to private conversations.",
    icon: ShieldCheck,
  },
  {
    title: "Violations can lead to suspension or a permanent ban",
    body:
      "Accounts that violate our Community Guidelines can be temporarily " +
      "suspended or permanently banned, depending on the severity and " +
      "pattern of the behaviour. Suspicious or abusive behaviour is " +
      "monitored on an ongoing basis, not only when someone reports it.",
    icon: Ban,
  },
  {
    title: "Unmatch and hide-profile controls are always yours",
    body:
      "You can unmatch with anyone, or hide your profile from discovery, " +
      "without needing a reason and without it affecting your ability to " +
      "use the rest of the app.",
    icon: EyeOff,
  },
  {
    title: "How to get help",
    body:
      "If you feel unsafe, or need help with a report, suspension appeal, " +
      "or anything else safety-related, use the in-app report/block flow " +
      "or reach our support team through the Contact page. We aim to " +
      "respond to safety reports as a priority.",
    icon: LifeBuoy,
  },
];

/**
 * Plain-language summary of the platform's safety and moderation
 * commitments for the Safety information page.
 */
export function SafetyHighlights() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <div className="space-y-5">
        {SAFETY_POINTS.map((point) => {
          const Icon = point.icon;
          return (
            <div
              key={point.title}
              className="flex gap-5 rounded-xl2 border border-neutral-200 bg-white p-6 shadow-card transition-shadow hover:shadow-soft"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold text-neutral-900">
                  {point.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{point.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
