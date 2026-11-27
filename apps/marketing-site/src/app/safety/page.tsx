import { SafetyHighlights } from "@/features/safety/components/SafetyHighlights";

/**
 * Safety information page: thin composition of the safety feature component.
 */
export default function SafetyPage() {
  return (
    <div>
      <h1 style={{ padding: "24px 24px 0" }}>Your safety on Dating App</h1>
      <SafetyHighlights />
    </div>
  );
}
