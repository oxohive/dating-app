/**
 * Generates a new correlation id (UUID v4).
 *
 * This is a pure function on purpose: it takes no arguments, has no
 * side effects beyond random number generation, and is cheap to unit
 * test. Every outbound API request should carry a fresh correlation id
 * so that a single user action can be traced across the mobile client,
 * the backend, and logs.
 *
 * Implemented as a small self-contained RFC 4122 v4 generator (rather
 * than pulling in the `uuid` package) so this module has zero runtime
 * dependencies and behaves identically under Jest and the React
 * Native/Hermes runtime.
 */
export function generateCorrelationId(): string {
  const hex: string[] = [];

  for (let i = 0; i < 16; i += 1) {
    hex.push(Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'));
  }

  // Per RFC 4122 §4.4: set version (4) and variant (10) bits.
  const version = hex[6] ? hex[6] : '00';
  hex[6] = `4${version.slice(1)}`;
  const variantByte = parseInt(hex[8] ?? '00', 16);
  hex[8] = ((variantByte & 0x3f) | 0x80).toString(16).padStart(2, '0');

  const bytes = hex.join('');
  return [
    bytes.slice(0, 8),
    bytes.slice(8, 12),
    bytes.slice(12, 16),
    bytes.slice(16, 20),
    bytes.slice(20, 32),
  ].join('-');
}
