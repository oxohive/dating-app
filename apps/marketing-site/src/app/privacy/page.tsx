import { PrivacyContent } from "@/features/legal/components/PrivacyContent";

/**
 * Privacy policy page: thin composition of the legal feature component.
 */
export default function PrivacyPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 px-6 py-16 text-center sm:py-20">
        <h1 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Privacy policy
        </h1>
      </div>
      <PrivacyContent />
    </div>
  );
}
