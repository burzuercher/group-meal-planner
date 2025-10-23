import { MD3LightTheme as DefaultTheme, configureFonts } from 'react-native-paper';

// Custom color palette
const colors = {
  primary: '#6200ee',
  primaryContainer: '#bb86fc',
  secondary: '#03dac6',
  secondaryContainer: '#018786',
  background: '#f5f5f5',
  surface: '#ffffff',
  error: '#b00020',
  success: '#4caf50',
  warning: '#ff9800',

  // Item status colors
  available: '#4caf50',     // Green for available items
  reserved: '#9e9e9e',      // Gray for items reserved by others
  myReserved: '#2196f3',    // Blue for items reserved by user

  text: {
    primary: '#000000',
    secondary: '#666666',
    disabled: '#9e9e9e',
    onPrimary: '#ffffff',
  },

  border: '#e0e0e0',
};

// Typography
const fontConfig = {
  displayLarge: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 36,
  },
  titleLarge: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  titleMedium: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  labelLarge: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
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

export default theme;
