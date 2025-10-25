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
  const { width, height } = Dimensions.get('window');

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
          <TouchableWithoutFeedback>
            <View style={styles.contentContainer}>
              {/* Close button */}
              <IconButton
                icon="close"
                iconColor={colors.text.onPrimary}
                size={28}
                onPress={onClose}
                style={styles.closeButton}
              />

              {/* Image container */}
              <View style={styles.imageContainer}>
                {imageLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                )}
                <Image
                  source={{ uri: imageUrl }}
                  style={[
                    styles.image,
                    {
                      maxWidth: width * 0.9,
                      maxHeight: height * 0.8,
                    },
                  ]}
                  resizeMode="contain"
                  onLoadStart={() => setImageLoading(true)}
                  onLoadEnd={() => setImageLoading(false)}
                />
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
  image: {
    width: '100%',
    height: '100%',
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
});
