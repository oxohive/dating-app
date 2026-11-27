import { FaqAccordion } from "@/features/faq/components/FaqAccordion";

/**
 * FAQ page: thin composition of the FAQ feature component.
 */
export default function FaqPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 px-6 py-16 text-center sm:py-20">
        <h1 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          Everything you need to know before you get started.
        </p>
      </div>
      <FaqAccordion />
    </div>
  );
}
