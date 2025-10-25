import {
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';

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

// Note: Image caching, normalization, and generation logic is now handled
// by the Cloud Function to keep API keys secure and ensure consistent behavior

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

// Cloud Function interfaces
interface GenerateMenuImageRequest {
  menuTitle: string;
  groupId: string;
  userName: string;
}

interface GenerateMenuImageResponse {
  imageUrl: string | null;
  cached: boolean;
  budgetExceeded: boolean;
  error?: string;
}

// Initialize callable function
const generateMenuImageFunction = httpsCallable<
  GenerateMenuImageRequest,
  GenerateMenuImageResponse
>(functions, 'generateMenuImage');

/**
 * Main function: Generates and caches a menu image using Cloud Function
 * Returns the image URL or null if generation fails
 *
 * Flow:
 * 1. Calls cloud function with menuTitle, groupId, and userName
 * 2. Cloud function handles:
 *    - Group membership validation
 *    - Cache checking
 *    - Budget checking
 *    - Image generation with Gemini
 *    - Storage upload
 *    - Cache saving
 *    - Budget tracking
 * 3. Returns image URL or null
 */
export async function generateAndCacheMenuImage(
  menuTitle: string,
  groupId: string,
  userName: string
): Promise<string | null> {
  try {
    console.log(`Requesting image generation for: "${menuTitle}"`);
    console.log(`Group: ${groupId}, User: ${userName}`);

    // Call cloud function
    const result = await generateMenuImageFunction({
      menuTitle,
      groupId,
      userName,
    });

    const { imageUrl, cached, budgetExceeded, error } = result.data;

    if (budgetExceeded) {
      console.warn('Image generation skipped: budget cap reached');
      return null;
    }

    if (error) {
      console.error('Cloud function error:', error);
      return null;
    }

    if (cached) {
      console.log('Image retrieved from cache');
    } else if (imageUrl) {
      console.log('New image generated successfully');
    }

    return imageUrl;
  } catch (error) {
    console.error('Error calling generateMenuImage function:', error);
    return null;
  }
}
