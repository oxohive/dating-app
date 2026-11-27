import { CityBreakdown } from "@/features/dashboard/api/dashboard.api";

/**
 * Pure state-update helper that orders city-breakdown entries by user count,
 * highest first, so the busiest cities surface at the top of the table
 * regardless of the order the backend returns rows in. Ties break
 * alphabetically by city name for a stable, deterministic order.
 */
export function sortCityBreakdownDescending(entries: CityBreakdown[]): CityBreakdown[] {
  return [...entries].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.city.localeCompare(b.city);
  });
}
