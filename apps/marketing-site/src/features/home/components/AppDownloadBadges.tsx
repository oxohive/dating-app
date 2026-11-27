import { Apple, PlayCircle } from "lucide-react";

interface StoreBadge {
  store: string;
  note: string;
}

const STORE_BADGES: StoreBadge[] = [
  { store: "App Store", note: "Coming soon" },
  { store: "Google Play", note: "Coming soon" },
];

const STORE_ICONS: Record<string, typeof Apple> = {
  "App Store": Apple,
  "Google Play": PlayCircle,
};

/**
 * Placeholder app store download badges.
 *
 * There are no live App Store / Play Store listings yet (we're in the
 * Chennai pilot), so these are intentionally non-functional placeholders
 * rather than links to a real or fake store page.
 */
export function AppDownloadBadges() {
  return (
    <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
      <p className="mb-6 text-sm text-neutral-600">
        We&apos;re in the Chennai pilot, so Dating App isn&apos;t on the
        public app stores just yet. Badges below will go live at launch.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        {STORE_BADGES.map((badge) => {
          const Icon = STORE_ICONS[badge.store];
          return (
            <div
              key={badge.store}
              aria-disabled="true"
              className="flex min-w-[180px] items-center gap-3 rounded-xl2 border border-neutral-200 bg-neutral-50 px-5 py-3.5 text-left text-neutral-600"
            >
              <Icon className="h-6 w-6 flex-shrink-0 text-neutral-300" aria-hidden="true" />
              <div>
                <strong className="block text-sm font-semibold text-neutral-600">
                  {badge.store}
                </strong>
                <span className="text-xs">{badge.note}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
