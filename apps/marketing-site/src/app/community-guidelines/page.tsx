import { CommunityGuidelines } from "@/features/legal/components/CommunityGuidelines";

/**
 * Community guidelines page: thin composition of the legal feature component.
 */
export default function CommunityGuidelinesPage() {
  return (
    <div>
      <h1 style={{ padding: "24px 24px 0" }}>Community guidelines</h1>
      <CommunityGuidelines />
    </div>
  );
}
