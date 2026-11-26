/**
 * Formats a price given in paise (1/100 rupee) as a rupee string, e.g.
 * 29900 -> "₹299". Pure helper, used by the pricing table and unit tested
 * directly so CI has a non-flaky signal without rendering Next.js pages.
 */
export function formatPriceInRupees(priceInPaise: number): string {
  if (priceInPaise <= 0) {
    return "Free";
  }
  const rupees = priceInPaise / 100;
  return `₹${rupees.toLocaleString("en-IN")}`;
}
