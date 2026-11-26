/**
 * Turns a comma-separated free-text input (used for the "interests"
 * field in onboarding and profile editing) into a trimmed, non-empty
 * list of strings. Pure and tiny on purpose so it's trivially testable.
 */
export function parseCommaSeparatedList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}
