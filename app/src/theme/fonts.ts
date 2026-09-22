import { Platform } from 'react-native';

/**
 * Centralized Font Hierarchy
 *
 * - display: Sacred, stately serif for brand titles, score numerals, and section headers
 * - serif: Classical editorial serif for wisdom quotes and Vastu sutras
 * - sans: Ultra-clean geometric sans for UI controls, metrics, and form inputs
 */
export const fonts = {
  display: Platform.select({
    ios: 'Cinzel',
    android: 'serif',
    default: 'Georgia',
  }),

  serif: Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }),

  sans: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'sans-serif',
  }),

  sansMedium: Platform.select({
    ios: 'System',
    android: 'sans-serif-medium',
    default: 'sans-serif',
  }),
};
