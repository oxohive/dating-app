/**
 * Pure helper that converts a raw count into a 0-100 percentage of the
 * largest count in the current series, for the CSS-bar visualization used
 * by `RegistrationsByDayTable` (no charting library is installed - see
 * plan.md section 4 - so bars are plain styled `<div>` widths driven by
 * this calculation).
 *
 * Guards against a zero/negative max (an empty or all-zero series) so
 * callers never divide by zero or render a negative/`NaN` width.
 */
export function computeBarWidthPercent(count: number, maxCount: number): number {
  if (maxCount <= 0) {
    return 0;
  }
  const percent = (count / maxCount) * 100;
  return Math.max(0, Math.min(100, percent));
}
