import { PricingTable } from "@/features/pricing/components/PricingTable";

/**
 * Pricing page: thin composition of the pricing feature component.
 */
export default function PricingPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 px-6 py-16 text-center sm:py-20">
        <h1 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Pricing
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          Simple plans that grow with you. No hidden fees.
        </p>
      </div>
      <PricingTable />
    </div>
  );
}
