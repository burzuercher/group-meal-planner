import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as ImageManipulator from 'expo-image-manipulator';
import { storage } from './firebase';

/**
 * Upload a profile image to Firebase Storage
 * @param userId - Unique identifier for the user (could be name + timestamp)
 * @param imageUri - Local file URI from image picker
 * @returns Download URL for the uploaded image
 */
export async function uploadProfileImage(userId: string, imageUri: string): Promise<string> {
  try {
    // Resize and compress the image to circle-friendly dimensions
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 300, height: 300 } }], // Square image for circular display
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    // Convert to blob
    const response = await fetch(manipulatedImage.uri);
    const blob = await response.blob();

    // Create storage reference
    const storageRef = ref(storage, `profile-images/${userId}.jpg`);

    // Upload
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw new Error('Failed to upload profile image');
  }
}

/**
 * Delete a profile image from Firebase Storage
 * @param imageUrl - The download URL of the image to delete
 */
export async function deleteProfileImage(imageUrl: string): Promise<void> {
  try {
    // Extract the storage path from the download URL
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting profile image:', error);
    // Don't throw - it's okay if the old image doesn't exist
  }
}
