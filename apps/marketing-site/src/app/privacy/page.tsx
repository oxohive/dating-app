import { PrivacyContent } from "@/features/legal/components/PrivacyContent";

/**
 * Privacy policy page: thin composition of the legal feature component.
 */
export default function PrivacyPage() {
  return (
    <div>
      <h1 style={{ padding: "24px 24px 0" }}>Privacy policy</h1>
      <PrivacyContent />
    </div>
  );
}
