import { CommunityGuidelines } from "@/features/legal/components/CommunityGuidelines";

/**
 * Community guidelines page: thin composition of the legal feature component.
 */
export default function CommunityGuidelinesPage() {
  return (
    <div>
      <div className="bg-gradient-to-br from-primary-50 via-white to-accent-50 px-6 py-16 text-center sm:py-20">
        <h1 className="font-display text-3xl font-extrabold text-neutral-900 sm:text-4xl">
          Community guidelines
        </h1>
      </div>
      <CommunityGuidelines />
    </div>
  );
}
