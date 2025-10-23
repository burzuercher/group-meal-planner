import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { colors } from '../theme';

interface AvatarProps {
  imageUri?: string;
  name: string;
  size?: number;
  style?: ViewStyle;
}

/**
 * Avatar component that displays a profile image or initials
 */
export default function Avatar({ imageUri, name, size = 40, style }: AvatarProps) {
  // Get initials from name
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Generate consistent color from name
  const getColorFromName = (name: string): string => {
    const avatarColors = [
      '#2e7d32', // green
      '#1976d2', // blue
      '#f57c00', // orange
      '#7b1fa2', // purple
      '#c62828', // red
      '#00796b', // teal
      '#5d4037', // brown
      '#455a64', // blue grey
    ];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarColors[Math.abs(hash) % avatarColors.length];
  };

  const backgroundColor = getColorFromName(name);
  const containerSize = { width: size, height: size, borderRadius: size / 2 };
  const fontSize = size / 2.2;

  return (
    <View style={[styles.container, containerSize, { backgroundColor }, style]}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={[styles.image, containerSize]} />
      ) : (
        <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: colors.text.onPrimary,
    fontWeight: '600',
  },
});
