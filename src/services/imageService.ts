import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { db, storage, GEMINI_API_KEY } from './firebase';

// Gemini Image Generation API configuration
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

// Budget configuration
export const COST_PER_IMAGE = 0.04; // $0.04 per image
export const BUDGET_CAP = 25.0; // $25 total cap across all usage

interface MenuImageCache {
  normalizedTitle: string;
  imageUrl: string;
  createdAt: Date;
}

interface ImageGenerationBudget {
  totalImagesGenerated: number;
  totalCostSpent: number;
  lastUpdated: Date;
}

/**
 * Normalizes a menu title for caching
 * Simple normalization - lowercase and clean special characters
 * The AI prompt will handle ignoring person names
 * Examples:
 *   "Matt's Smoked Ribs" → "matts smoked ribs"
 *   "Tacos!" → "tacos"
 *   "Sarah's Chili" → "sarahs chili"
 */
export function normalizeMenuTitle(title: string): string {
  // Convert to lowercase
  let normalized = title.toLowerCase();

  // Remove special characters except spaces and hyphens
  normalized = normalized.replace(/[^a-z0-9\s-]/g, '');

  // Trim and collapse multiple spaces
  normalized = normalized.trim().replace(/\s+/g, ' ');

  return normalized;
}

/**
 * Creates a filename-safe version of normalized title
 * "smoked ribs" → "smoked-ribs"
 */
function titleToFilename(normalizedTitle: string): string {
  return normalizedTitle.replace(/\s+/g, '-');
}

/**
 * Checks if an image already exists in the cache for this menu title
 */
export async function checkImageCache(
  normalizedTitle: string
): Promise<string | null> {
  try {
    const cacheRef = collection(db, 'menuImageCache');
    const q = query(cacheRef, where('normalizedTitle', '==', normalizedTitle));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data() as MenuImageCache;
      console.log('Image cache hit for:', normalizedTitle);
      return data.imageUrl;
    }

    console.log('Image cache miss for:', normalizedTitle);
    return null;
  } catch (error) {
    console.error('Error checking image cache:', error);
    return null;
  }
}

/**
 * Saves an image URL to the cache
 */
async function cacheImageUrl(
  normalizedTitle: string,
  imageUrl: string
): Promise<void> {
  try {
    const cacheRef = doc(collection(db, 'menuImageCache'));
    await setDoc(cacheRef, {
      normalizedTitle,
      imageUrl,
      createdAt: new Date(),
    });
    console.log('Cached image for:', normalizedTitle);
  } catch (error) {
    console.error('Error caching image URL:', error);
  }
}

/**
 * Gets the current image generation budget status
 * Returns budget info or null if not initialized
 */
export async function getImageGenerationBudgetStatus(): Promise<ImageGenerationBudget | null> {
  try {
    const budgetRef = doc(db, 'globalStats', 'imageGeneration');
    const budgetDoc = await getDoc(budgetRef);

    if (!budgetDoc.exists()) {
      return null;
    }

    const data = budgetDoc.data();
    return {
      totalImagesGenerated: data.totalImagesGenerated,
      totalCostSpent: data.totalCostSpent,
      lastUpdated: data.lastUpdated.toDate(),
    };
  } catch (error) {
    console.error('Error getting image generation budget status:', error);
    return null;
  }
}

/**
 * Checks if we have budget remaining for image generation
 * Returns true if under budget cap, false if cap reached
 */
async function checkImageGenerationBudget(): Promise<boolean> {
  try {
    const budgetRef = doc(db, 'globalStats', 'imageGeneration');
    const budgetDoc = await getDoc(budgetRef);

    if (!budgetDoc.exists()) {
      // No tracking yet, budget available
      return true;
    }

    const data = budgetDoc.data() as ImageGenerationBudget;
    const projectedCost = data.totalCostSpent + COST_PER_IMAGE;

    if (projectedCost > BUDGET_CAP) {
      console.warn(`Image generation budget cap reached: $${data.totalCostSpent.toFixed(2)} / $${BUDGET_CAP}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking image generation budget:', error);
    // Fail open - allow generation if we can't check budget
    return true;
  }
}

/**
 * Increments the image generation cost tracking using a Firestore transaction
 * This ensures atomic updates even with concurrent image generation
 */
async function incrementImageGenerationCost(): Promise<void> {
  try {
    const budgetRef = doc(db, 'globalStats', 'imageGeneration');

    await runTransaction(db, async (transaction) => {
      const budgetDoc = await transaction.get(budgetRef);

      if (!budgetDoc.exists()) {
        // Initialize tracking document
        transaction.set(budgetRef, {
          totalImagesGenerated: 1,
          totalCostSpent: COST_PER_IMAGE,
          lastUpdated: Timestamp.fromDate(new Date()),
        });
      } else {
        const data = budgetDoc.data() as ImageGenerationBudget;
        transaction.update(budgetRef, {
          totalImagesGenerated: data.totalImagesGenerated + 1,
          totalCostSpent: data.totalCostSpent + COST_PER_IMAGE,
          lastUpdated: Timestamp.fromDate(new Date()),
        });
      }
    });

    console.log('Image generation cost tracked: +$' + COST_PER_IMAGE.toFixed(2));
  } catch (error) {
    console.error('Error incrementing image generation cost:', error);
    // Don't throw - we don't want to fail the image generation if tracking fails
  }
}

/**
 * Crafts an Imagen prompt for comic-style food illustration
 * Instructs the AI to ignore any person's names and focus on the food
 */
function createImagePrompt(menuTitle: string): string {
  return `A colorful, comic book style illustration of ${menuTitle}. Focus only on the food itself, ignore any person's names in the title. Vibrant colors, cartoon aesthetic, playful and fun, food-focused, no text, no watermarks, clean background, appetizing`;
}

// Note: Removed base64ToBlob function - React Native doesn't support Blob creation from ArrayBuffer
// Instead, we'll upload the base64 string directly to Firebase Storage

/**
 * Generates an image using Gemini 2.5 Flash Image API
 * Uses the Google AI Studio API endpoint with correct format
 * Returns base64 string instead of Blob (React Native compatible)
 */
async function generateImageWithImagen(prompt: string): Promise<{ base64: string; mimeType: string }> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY_HERE')) {
    throw new Error(
      'Gemini API key not configured. Please add your API key to src/services/firebase.ts'
    );
  }

  const endpoint = `${GEMINI_API_BASE}/models/${IMAGE_MODEL}:generateContent`;

  console.log('Generating image with Gemini 2.5 Flash Image...');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt }
        ]
      }],
      generationConfig: {
        responseModalities: ['Image'],
        imageConfig: {
          aspectRatio: '4:3'
        }
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error response:', errorText);
    console.error('Gemini API status:', response.status, response.statusText);
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  console.log('Gemini API response received');
  console.log('Full response structure:', JSON.stringify(data, null, 2));

  // Extract image from response
  // Gemini returns the image in candidates[0].content.parts[0].inlineData.data
  if (!data.candidates || data.candidates.length === 0) {
    console.error('No candidates in response:', data);
    throw new Error('No image generated by Gemini API');
  }

  console.log('Candidates found:', data.candidates.length);
  console.log('First candidate structure:', JSON.stringify(data.candidates[0], null, 2));

  const imagePart = data.candidates[0]?.content?.parts?.find(
    (part: any) => part.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart || !imagePart.inlineData?.data) {
    console.error('No image part found. Parts:', JSON.stringify(data.candidates[0]?.content?.parts, null, 2));
    throw new Error('No image data found in Gemini response');
  }

  const base64Image = imagePart.inlineData.data;
  const mimeType = imagePart.inlineData.mimeType || 'image/png';

  console.log('Image generated successfully');
  return { base64: base64Image, mimeType };
}

/**
 * Uploads a base64 image to Firebase Storage
 * React Native compatible - uses FileSystem to write temp file, then uploads
 */
async function uploadImageToStorage(
  base64Image: string,
  filename: string,
  mimeType: string
): Promise<string> {
  let tempFileUri: string | null = null;

  try {
    // Write base64 to temporary file
    const fileExtension = mimeType.includes('png') ? 'png' : 'jpg';
    tempFileUri = `${FileSystem.documentDirectory}${filename}.${fileExtension}`;

    console.log('Writing base64 to temp file:', tempFileUri);
    await FileSystem.writeAsStringAsync(tempFileUri, base64Image, {
      encoding: 'base64',
    });

    // Read the file as a blob (React Native compatible way)
    console.log('Reading file for upload...');
    const fileBlob = await fetch(tempFileUri).then((r) => r.blob());

    // Upload to Firebase Storage
    const storageRef = ref(storage, `menu-images/${filename}.${fileExtension}`);
    console.log('Uploading to Firebase Storage...');

    await uploadBytesResumable(storageRef, fileBlob);

    const downloadUrl = await getDownloadURL(storageRef);
    console.log('Upload complete:', downloadUrl);

    return downloadUrl;
  } catch (error) {
    console.error('Error uploading image to Storage:', error);
    throw new Error('Failed to upload image');
  } finally {
    // Clean up temp file
    if (tempFileUri) {
      try {
        await FileSystem.deleteAsync(tempFileUri, { idempotent: true });
        console.log('Cleaned up temp file');
      } catch (cleanupError) {
        console.warn('Failed to clean up temp file:', cleanupError);
      }
    }
  }
}

/**
 * Main function: Generates and caches a menu image
 * Returns the image URL or null if generation fails
 *
 * Flow:
 * 1. Normalize title
 * 2. Check cache
 * 3. If cache hit, return existing URL
 * 4. If cache miss, generate new image
 * 5. Upload to Storage
 * 6. Cache the URL
 * 7. Return URL
 */
export async function generateAndCacheMenuImage(
  menuTitle: string
): Promise<string | null> {
  try {
    const normalizedTitle = normalizeMenuTitle(menuTitle);
    console.log(`Generating image for: "${menuTitle}" (normalized: "${normalizedTitle}")`);

    // Check cache first
    const cachedUrl = await checkImageCache(normalizedTitle);
    if (cachedUrl) {
      return cachedUrl;
    }

    // Check budget before generating new image
    const budgetAvailable = await checkImageGenerationBudget();
    if (!budgetAvailable) {
      console.warn('Image generation skipped: budget cap reached');
      return null;
    }

    // Generate new image - pass original title so AI can understand context
    const prompt = createImagePrompt(menuTitle);
    console.log('Imagen prompt:', prompt);

    // Generate image with Gemini API
    try {
      console.log('Starting image generation...');
      const imageData = await generateImageWithImagen(prompt);
      console.log('Image generated, type:', imageData.mimeType);

      // Upload to Storage
      const filename = titleToFilename(normalizedTitle);
      console.log('Uploading to Storage with filename:', filename);
      const imageUrl = await uploadImageToStorage(imageData.base64, filename, imageData.mimeType);
      console.log('Image uploaded successfully:', imageUrl);

      // Increment cost tracking (do this before caching to ensure we track even if cache fails)
      await incrementImageGenerationCost();

      // Cache the URL
      await cacheImageUrl(normalizedTitle, imageUrl);
      console.log('Image cached successfully');

      return imageUrl;
    } catch (imagenError) {
      console.error('Image generation failed with error:', imagenError);
      console.error('Error details:', imagenError instanceof Error ? imagenError.message : imagenError);
      return null;
    }
  } catch (error) {
    console.error('Error in generateAndCacheMenuImage:', error);
    return null;
  }
}
