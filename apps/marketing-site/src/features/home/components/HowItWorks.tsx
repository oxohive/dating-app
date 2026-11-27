import { UserPlus, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";

interface Step {
  title: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    title: "Create a profile",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    icon: UserPlus,
  },
  {
    title: "Get verified",
    description: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    icon: ShieldCheck,
  },
  {
    title: "Start matching",
    description: "Ut enim ad minim veniam, quis nostrud exercitation ullamco.",
    icon: Sparkles,
  },
];

/**
 * Homepage "how it works" steps section.
 */
export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
      <div className="mb-14 text-center">
        <h2 className="font-display text-3xl font-bold text-neutral-900 sm:text-4xl">
          How it works
        </h2>
        <p className="mt-3 text-neutral-500">Three simple steps to your next great match.</p>
      </div>

      <div className="grid gap-8 sm:grid-cols-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="group relative rounded-xl2 border border-neutral-200 bg-white p-8 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-soft"
            >
              <span className="absolute right-6 top-6 font-display text-3xl font-extrabold text-primary-100">
                {index + 1}
              </span>
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-500 group-hover:text-white">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-display text-lg font-semibold text-neutral-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{step.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
