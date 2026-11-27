import { TermsContent } from "@/features/legal/components/TermsContent";

/**
 * Terms and conditions page: thin composition of the legal feature component.
 */
export default function TermsPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 px-6 py-16 text-center sm:py-20">
        <h1 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Terms and conditions
        </h1>
      </div>
      <TermsContent />
    </div>
  );
}
