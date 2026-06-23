/**
 * JyotishCall Design System — Unified Theme Export
 * Import this single object for all design tokens.
 *
 * Usage:
 *   import theme from '../theme';
 *   <View style={{ backgroundColor: theme.colors.background, padding: theme.spacing.lg }} />
 */

import colors from './colors';
import typography from './typography';
import spacing from './spacing';
import radius from './radius';
import shadows from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
};

export { colors, typography, spacing, radius, shadows };
export default theme;
