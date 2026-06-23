/**
 * JyotishCall Design Tokens — Colors
 * Dark-inspired premium aesthetic with warm undertones.
 * All colors are semantic; never reference hex literals directly in components.
 */

export const colors = {
  // Primary Brand — gold accent (CRED dark luxury)
  primary: '#C8A46A',
  primaryLight: '#D4B896',
  primaryDark: '#A68B5B',
  primaryMuted: 'rgba(200, 164, 106, 0.12)',

  // Secondary / Accent — muted warm complement
  secondary: '#8A8A8A',
  secondaryLight: '#A0A0A0',
  secondaryMuted: 'rgba(138, 138, 138, 0.1)',

  // Backgrounds — dark palette
  background: '#111111',
  backgroundElevated: '#1A1A1A',
  darkBackground: '#111111',
  surface: '#1A1A1A',
  surfaceSecondary: '#222222',
  surfaceTertiary: '#2A2A2A',

  // Text — light on dark
  textPrimary: '#F5F5F5',
  textSecondary: '#8A8A8A',
  textMuted: '#666666',
  textInverse: '#111111',

  // Semantic — muted on dark
  success: '#4ADE80',
  successMuted: 'rgba(74, 222, 128, 0.1)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.1)',
  error: '#F87171',
  errorMuted: 'rgba(248, 113, 113, 0.1)',
  info: '#60A5FA',
  infoMuted: 'rgba(96, 165, 250, 0.1)',

  // UI
  border: '#2A2A2A',
  divider: '#2A2A2A',
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.3)',

  // Premium Accents — for bookings & gold treatments
  accentGold: '#D4AF37',
  accentGoldLight: '#E8D5A3',
  accentGoldMuted: 'rgba(212, 175, 55, 0.12)',
  accentPurple: '#5B4BFF',
  accentPurpleLight: '#8B7FFF',
  accentPurpleMuted: 'rgba(91, 75, 255, 0.12)',

  // Gradients (defined as arrays for expo-linear-gradient)
  gradientPremium: ['#111111', '#1A1A1A'],
  gradientWarm: ['#111111', '#1A1A1A'],
  gradientPrimary: ['#C8A46A', '#D4B896'],
  gradientGold: ['#D4AF37', '#B5A06D'],
  gradientCosmic: ['#111111', '#1A1A2E', '#16213E'],
};

export default colors;
