import { TermsContent } from "@/features/legal/components/TermsContent";

/**
 * Terms and conditions page: thin composition of the legal feature component.
 */
export default function TermsPage() {
  return (
    <div>
      <h1 style={{ padding: "24px 24px 0" }}>Terms and conditions</h1>
      <TermsContent />
    </div>
  );
}
