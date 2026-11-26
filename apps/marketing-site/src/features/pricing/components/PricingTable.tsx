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

/**
 * Pricing plans table for the pricing page.
 */
export function PricingTable() {
  return (
    <section style={{ padding: "48px 24px", display: "flex", gap: 24, flexWrap: "wrap" }}>
      {PLANS.map((plan) => (
        <div key={plan.name} style={{ flex: 1, minWidth: 220, border: "1px solid #e5e7eb", borderRadius: 8, padding: 24 }}>
          <h3>{plan.name}</h3>
          <p style={{ fontSize: 24, fontWeight: 700 }}>{formatPriceInRupees(plan.priceInPaise)}/mo</p>
          <ul>
            {plan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <Button href="#">Choose {plan.name}</Button>
        </div>
      ))}
    </section>
  );
}
