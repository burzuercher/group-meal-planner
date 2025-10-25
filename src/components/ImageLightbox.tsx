import React, { useState } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions,
  Text,
} from 'react-native';
import { IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme';

interface ImageLightboxProps {
  visible: boolean;
  imageUrl: string | null | undefined;
  onClose: () => void;
  title?: string;
}

/**
 * Full-screen image modal/lightbox component
 * Shows an image in a modal overlay with close button
 * Tap outside the image to close
 */
export default function ImageLightbox({
  visible,
  imageUrl,
  onClose,
  title,
}: ImageLightboxProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { width, height } = Dimensions.get('window');

  // Debug: Log the imageUrl when component mounts or imageUrl changes
  React.useEffect(() => {
    if (visible) {
      console.log('ImageLightbox - imageUrl:', imageUrl);
      console.log('ImageLightbox - imageUrl type:', typeof imageUrl);
      setImageError(false);
      setImageLoading(true);
    }
  }, [visible, imageUrl]);

  if (!imageUrl) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* Close button - outside the content to receive touches */}
          <IconButton
            icon="close"
            iconColor={colors.text.onPrimary}
            size={28}
            onPress={onClose}
            style={styles.closeButton}
          />

          {/* Image content - prevents tap-to-close when tapping the image */}
          <TouchableWithoutFeedback>
            <View style={styles.contentContainer}>
              {/* Image container */}
              <View style={styles.imageContainer}>
                {imageLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
                <Image
                  source={{ uri: imageUrl }}
                  style={{
                    width: width * 0.9,
                    height: height * 0.8,
                  }}
                  resizeMode="contain"
                  onLoadStart={() => {
                    console.log('Image loading started');
                    setImageLoading(true);
                    setImageError(false);
                  }}
                  onLoadEnd={() => {
                    console.log('Image loading ended');
                    setImageLoading(false);
                  }}
                  onError={(error) => {
                    console.error('Image loading error:', error.nativeEvent.error);
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
                {imageError && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={60}
                      color={colors.error}
                    />
                    <Text style={styles.errorText}>Failed to load image</Text>
                    <Text style={styles.errorUrlText}>{imageUrl}</Text>
                  </View>
                )}
              </View>

              {/* Placeholder if no image */}
              {!imageUrl && (
                <View style={styles.placeholderContainer}>
                  <MaterialCommunityIcons
                    name="food"
                    size={80}
                    color={colors.text.disabled}
                  />
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 10,
  },
  errorText: {
    color: colors.text.onPrimary,
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorUrlText: {
    color: colors.text.disabled,
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
});
