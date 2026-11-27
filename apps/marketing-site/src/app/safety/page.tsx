import { SafetyHighlights } from "@/features/safety/components/SafetyHighlights";

/**
 * Safety information page: thin composition of the safety feature component.
 */
export default function SafetyPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 px-6 py-16 text-center sm:py-20">
        <h1 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Your safety on Dating App
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-neutral-600">
          The tools and commitments that keep our community safe.
        </p>
      </div>
      <SafetyHighlights />
    </div>
  );
}
