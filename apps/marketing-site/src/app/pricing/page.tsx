import { PricingTable } from "@/features/pricing/components/PricingTable";

/**
 * Pricing page: thin composition of the pricing feature component.
 */
export default function PricingPage() {
  return (
    <div>
      <h1 style={{ padding: "24px 24px 0" }}>Pricing</h1>
      <PricingTable />
    </div>
  );
}
