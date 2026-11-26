/**
 * Minimal design tokens shared by every component. Keep this flat and
 * small for the MVP — grow it into a proper theme (dark mode, typed
 * variants, etc.) once the product direction settles.
 */

export const colors = {
  background: '#FFFFFF',
  surface: '#F7F3F5',
  primary: '#FF4365',
  primaryMuted: '#FFD9E0',
  text: '#1A1A1A',
  textMuted: '#6B6B6B',
  border: '#E5E5E5',
  danger: '#D1293D',
  success: '#2F9E63',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 999,
} as const;

export const typography = {
  title: { fontSize: 24, fontWeight: '700' as const },
  subtitle: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
};

export const theme = { colors, spacing, radii, typography };

export type Theme = typeof theme;
