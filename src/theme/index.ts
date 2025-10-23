import { MD3LightTheme as DefaultTheme, configureFonts } from 'react-native-paper';

// Custom color palette
const colors = {
  primary: '#2e7d32',        // Fresh green - suggests food, health, freshness
  primaryContainer: '#e8f5e9', // Light green tint
  secondary: '#ff6f00',       // Warm orange accent
  secondaryContainer: '#fff3e0',
  background: '#fafafa',      // Softer than pure gray
  surface: '#ffffff',
  error: '#d32f2f',
  success: '#2e7d32',         // Same as primary for consistency
  warning: '#f57c00',         // Amber for pending/proposed states

  // Menu status colors
  menuActive: '#2e7d32',      // Green for confirmed/active menus
  menuProposed: '#f57c00',    // Amber for proposed/pending menus
  menuActiveContainer: '#e8f5e9',
  menuProposedContainer: '#fff3e0',

  // Item status colors
  available: '#2e7d32',       // Green for available items
  reserved: '#757575',        // Medium gray for items reserved by others
  myReserved: '#1976d2',      // Clear blue for items reserved by user

  text: {
    primary: '#212121',       // Softer black
    secondary: '#757575',     // Medium gray
    disabled: '#bdbdbd',      // Light gray
    onPrimary: '#ffffff',
  },

  border: '#e0e0e0',
  elevation: {
    level1: 'rgba(0, 0, 0, 0.05)',
    level2: 'rgba(0, 0, 0, 0.08)',
  },
};

// Typography - Standardized hierarchy
const fontConfig = {
  displayLarge: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: 0,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: 0,
  },
  headlineLarge: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },
  headlineSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
    letterSpacing: 0,
  },
  titleLarge: {
    fontSize: 22,
    fontWeight: '500' as const,
    lineHeight: 28,
    letterSpacing: 0,
  },
  titleMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
};

// React Native Paper theme
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    primaryContainer: colors.primaryContainer,
    secondary: colors.secondary,
    secondaryContainer: colors.secondaryContainer,
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
  },
  fonts: configureFonts({ config: fontConfig }),
};

// Export custom colors for use in components
export { colors };

// Common spacing values
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius values
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 999,
};

// Elevation/Shadow values for depth
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  level1: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  level2: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  level3: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
};

// Gradient configurations for modern backgrounds
export const gradients = {
  header: {
    colors: ['#e8f5e9', '#f1f8f4', '#ffffff'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  headerAlt: {
    colors: ['#c8e6c9', '#e8f5e9', '#ffffff'] as const,
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  subtle: {
    colors: ['#ffffff', '#f5f5f5'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
};

export default theme;
