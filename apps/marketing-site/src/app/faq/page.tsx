import { FaqAccordion } from "@/features/faq/components/FaqAccordion";

/**
 * FAQ page: thin composition of the FAQ feature component.
 */
export default function FaqPage() {
  return (
    <div>
      <h1 style={{ padding: "24px 24px 0" }}>Frequently asked questions</h1>
      <FaqAccordion />
    </div>
  );
}
