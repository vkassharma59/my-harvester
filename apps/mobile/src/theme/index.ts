/** App-wide design tokens. Wheat/green agricultural palette. */
export const colors = {
  primary: '#1B5E20', // deep green
  primaryDark: '#0D3B11',
  primaryLight: '#4C8C4A',
  accent: '#F9A825', // wheat gold
  background: '#F5F6F4',
  surface: '#FFFFFF',
  border: '#E2E5E0',
  text: '#1A1C19',
  textMuted: '#5C625A',
  danger: '#C62828',
  success: '#2E7D32',
  warning: '#EF6C00',
  white: '#FFFFFF',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

export const font = {
  size: { xs: 12, sm: 14, md: 16, lg: 20, xl: 26, xxl: 32 },
  weight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
} as const;
