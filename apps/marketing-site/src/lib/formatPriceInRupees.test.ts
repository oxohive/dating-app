import { formatPriceInRupees } from "./formatPriceInRupees";

describe("formatPriceInRupees", () => {
  it("returns 'Free' for a zero price", () => {
    expect(formatPriceInRupees(0)).toBe("Free");
  });

  it("converts paise to a rupee-formatted string", () => {
    expect(formatPriceInRupees(29900)).toBe("₹299");
  });

  it("formats larger amounts with Indian digit grouping", () => {
    expect(formatPriceInRupees(10000000)).toBe("₹1,00,000");
  });
});
