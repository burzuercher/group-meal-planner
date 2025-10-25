import React from 'react';
import { View, Image, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '../theme';

interface MenuImageProps {
  imageUrl?: string | null;
  isGenerating?: boolean;
  title: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  onPress?: () => void;
}

/**
 * Displays AI-generated menu images with loading and placeholder states
 *
 * States:
 * - isGenerating: Shows loading shimmer/spinner
 * - imageUrl: Shows the actual image
 * - No image: Shows default food icon placeholder
 */
export default function MenuImage({
  imageUrl,
  isGenerating = false,
  title,
  size = 'medium',
  style,
  onPress,
}: MenuImageProps) {
  const dimensions = getDimensions(size);

  // Wrapper for tappable images
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? { onPress, activeOpacity: 0.7 }
    : {};

  // Loading state - image is being generated
  if (isGenerating) {
    return (
      <View style={[styles.container, dimensions, styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // Success state - image exists
  if (imageUrl) {
    return (
      <Wrapper
        style={[styles.container, dimensions, style]}
        {...wrapperProps}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      </Wrapper>
    );
  }

  // Placeholder state - no image available
  return (
    <View style={[styles.container, dimensions, styles.placeholderContainer, style]}>
      <MaterialCommunityIcons
        name="food"
        size={getIconSize(size)}
        color={colors.text.disabled}
      />
    </View>
  );
}

function getDimensions(size: 'small' | 'medium' | 'large'): ViewStyle {
  switch (size) {
    case 'small':
      return { width: 60, height: 60 };
    case 'medium':
      return { width: 120, height: 90 };
    case 'large':
      return { width: '100%', height: 200 };
  }
}

function getIconSize(size: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small':
      return 24;
    case 'medium':
      return 40;
    case 'large':
      return 60;
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
});
