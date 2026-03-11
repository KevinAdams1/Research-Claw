/**
 * HashMind-aligned design tokens for Research-Claw Dashboard.
 * Dark (terminal) theme is default; light (warm paper) is optional.
 */
export const darkTheme = {
  bg: {
    primary: '#0A0A0F',
    secondary: '#12121A',
    surface: '#1A1A25',
    surfaceHover: '#222230',
  },
  text: {
    primary: '#E8E8ED',
    secondary: '#9898A6',
    muted: '#5A5A6E',
  },
  border: {
    default: '#2A2A38',
    hover: '#3A3A4A',
  },
  accent: {
    red: '#EF4444',       // Lobster Red — primary brand
    blue: '#3B82F6',      // Academic Blue — secondary
    green: '#22C55E',     // Success / online
    amber: '#F59E0B',     // Warning / pending
  },
} as const;

export const lightTheme = {
  bg: {
    primary: '#FFFBF5',   // Warm paper
    secondary: '#FFF8EE',
    surface: '#FFFFFF',
    surfaceHover: '#F5F0E8',
  },
  text: {
    primary: '#1A1A2E',
    secondary: '#4A4A5E',
    muted: '#8A8A9E',
  },
  border: {
    default: '#E0DDD5',
    hover: '#C8C5BD',
  },
  accent: {
    red: '#DC2626',
    blue: '#2563EB',
    green: '#16A34A',
    amber: '#D97706',
  },
} as const;

export type ThemeTokens = typeof darkTheme;
