import { Check } from "lucide-react";
import { Button } from "@/components/Button";
import { formatPriceInRupees } from "@/lib/formatPriceInRupees";

export interface PricingPlan {
  name: string;
  priceInPaise: number;
  features: string[];
}

const PLANS: PricingPlan[] = [
  { name: "Free", priceInPaise: 0, features: ["Basic matching", "5 likes/day"] },
  { name: "Plus", priceInPaise: 29900, features: ["Unlimited likes", "See who liked you"] },
  { name: "Premium", priceInPaise: 59900, features: ["Everything in Plus", "Priority support"] },
];

const FEATURED_PLAN = "Plus";

/**
 * Pricing plans table for the pricing page.
 */
export function PricingTable() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <div className="grid gap-8 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isFeatured = plan.name === FEATURED_PLAN;
          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl2 border p-8 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-soft ${
                isFeatured
                  ? "border-primary-300 bg-white ring-2 ring-primary-400"
                  : "border-neutral-200 bg-white"
              }`}
            >
              {isFeatured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-500 px-4 py-1 text-xs font-semibold text-white shadow-soft">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-xl font-bold text-neutral-900">{plan.name}</h3>
              <p className="mt-4 font-display text-4xl font-extrabold text-neutral-900">
                {formatPriceInRupees(plan.priceInPaise)}
                <span className="text-base font-medium text-neutral-400">/mo</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-neutral-600">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button href="#" variant={isFeatured ? "primary" : "secondary"}>
                Choose {plan.name}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
