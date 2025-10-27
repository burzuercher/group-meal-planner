import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// Budget configuration
const COST_PER_IMAGE = 0.04; // $0.04 per image
const BUDGET_CAP = 25.0; // $25 total cap

// Gemini API configuration
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

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

/**
 * Normalizes a menu title for caching
 * Simple normalization - lowercase and clean special characters
 */
function normalizeMenuTitle(title: string): string {
  let normalized = title.toLowerCase();
  normalized = normalized.replace(/[^a-z0-9\s-]/g, '');
  normalized = normalized.trim().replace(/\s+/g, ' ');
  return normalized;
}

/**
 * Creates a filename-safe version of normalized title
 */
function titleToFilename(normalizedTitle: string): string {
  return normalizedTitle.replace(/\s+/g, '-');
}

/**
 * Validates that the user is a member of the specified group
 */
async function validateGroupMembership(
  groupId: string,
  userName: string
): Promise<boolean> {
  try {
    const groupDoc = await db.collection('groups').doc(groupId).get();

    if (!groupDoc.exists) {
      functions.logger.warn(`Group not found: ${groupId}`);
      return false;
    }

    const groupData = groupDoc.data();
    if (!groupData) return false;

    // Check if userName exists in members array
    const members = groupData.members || [];
    const isMember = members.some((member: any) =>
      member.name === userName
    );

    if (!isMember) {
      functions.logger.warn(`User ${userName} is not a member of group ${groupId}`);
    }

    return isMember;
  } catch (error) {
    functions.logger.error('Error validating group membership:', error);
    return false;
  }
}

/**
 * Checks if an image already exists in the cache
 */
async function checkImageCache(normalizedTitle: string): Promise<string | null> {
  try {
    const cacheSnapshot = await db
      .collection('menuImageCache')
      .where('normalizedTitle', '==', normalizedTitle)
      .limit(1)
      .get();

    if (!cacheSnapshot.empty) {
      const doc = cacheSnapshot.docs[0];
      const imageUrl = doc.data().imageUrl;
      functions.logger.info('Image cache hit for:', normalizedTitle);
      return imageUrl;
    }

    functions.logger.info('Image cache miss for:', normalizedTitle);
    return null;
  } catch (error) {
    functions.logger.error('Error checking image cache:', error);
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
    await db.collection('menuImageCache').add({
      normalizedTitle,
      imageUrl,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    functions.logger.info('Cached image for:', normalizedTitle);
  } catch (error) {
    functions.logger.error('Error caching image URL:', error);
  }
}

/**
 * Checks if we have budget remaining for image generation
 */
async function checkImageGenerationBudget(): Promise<boolean> {
  try {
    const budgetDoc = await db
      .collection('globalStats')
      .doc('imageGeneration')
      .get();

    if (!budgetDoc.exists) {
      return true; // No tracking yet, budget available
    }

    const data = budgetDoc.data();
    if (!data) return true;

    const projectedCost = data.totalCostSpent + COST_PER_IMAGE;

    if (projectedCost > BUDGET_CAP) {
      functions.logger.warn(
        `Budget cap reached: $${data.totalCostSpent.toFixed(2)} / $${BUDGET_CAP}`
      );
      return false;
    }

    return true;
  } catch (error) {
    functions.logger.error('Error checking budget:', error);
    return true; // Fail open
  }
}

/**
 * Increments the image generation cost tracking
 */
async function incrementImageGenerationCost(): Promise<void> {
  try {
    const budgetRef = db.collection('globalStats').doc('imageGeneration');

    await db.runTransaction(async (transaction) => {
      const budgetDoc = await transaction.get(budgetRef);

      if (!budgetDoc.exists) {
        transaction.set(budgetRef, {
          totalImagesGenerated: 1,
          totalCostSpent: COST_PER_IMAGE,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        const data = budgetDoc.data();
        if (data) {
          transaction.update(budgetRef, {
            totalImagesGenerated: data.totalImagesGenerated + 1,
            totalCostSpent: data.totalCostSpent + COST_PER_IMAGE,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    });

    functions.logger.info('Cost tracked: +$' + COST_PER_IMAGE.toFixed(2));
  } catch (error) {
    functions.logger.error('Error incrementing cost:', error);
  }
}

/**
 * Creates an image generation prompt
 */
function createImagePrompt(menuTitle: string): string {
  return `A colorful, comic book style illustration of ${menuTitle}. Focus only on the food itself, ignore any person's names in the title. Vibrant colors, cartoon aesthetic, playful and fun, food-focused, no text, no watermarks, clean background, appetizing`;
}

/**
 * Generates an image using Gemini API
 */
async function generateImageWithGemini(
  prompt: string,
  apiKey: string
): Promise<{ base64: string; mimeType: string }> {
  const endpoint = `${GEMINI_API_BASE}/models/${IMAGE_MODEL}:generateContent`;

  functions.logger.info('Generating image with Gemini...');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        responseModalities: ['Image'],
        imageConfig: {
          aspectRatio: '4:3',
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    functions.logger.error('Gemini API error:', response.status, errorText);
    throw new functions.https.HttpsError(
      'internal',
      `Gemini API error: ${response.status}`
    );
  }

  const data = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new functions.https.HttpsError(
      'internal',
      'No image generated by Gemini API'
    );
  }

  const imagePart = data.candidates[0]?.content?.parts?.find(
    (part: any) => part.inlineData?.mimeType?.startsWith('image/')
  );

  if (!imagePart || !imagePart.inlineData?.data) {
    throw new functions.https.HttpsError(
      'internal',
      'No image data found in Gemini response'
    );
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

/**
 * Uploads a base64 image to Firebase Storage
 */
async function uploadImageToStorage(
  base64Image: string,
  filename: string,
  mimeType: string
): Promise<string> {
  try {
    const fileExtension = mimeType.includes('png') ? 'png' : 'jpg';
    const filePath = `menu-images/${filename}.${fileExtension}`;

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Image, 'base64');

    // Upload to Storage
    const bucket = storage.bucket();
    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
      metadata: {
        contentType: mimeType,
      },
    });

    // Make the file publicly accessible
    await file.makePublic();

    // Get download URL
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    functions.logger.info('Upload complete:', downloadUrl);
    return downloadUrl;
  } catch (error) {
    functions.logger.error('Error uploading to Storage:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to upload image to Storage'
    );
  }
}

/**
 * Cloud Function: Generate and cache menu images with Gemini API
 *
 * This is a v2 Callable Function that:
 * 1. Validates user is a member of the specified group
 * 2. Checks cache for existing image
 * 3. Verifies budget hasn't been exceeded
 * 4. Generates image using Gemini API
 * 5. Uploads to Firebase Storage
 * 6. Caches the result
 * 7. Tracks budget usage
 */
/**
 * Cloud Function: Delete User Account and All Associated Data
 *
 * GDPR/CCPA Compliance - Handles complete account deletion:
 * 1. Removes user from all groups
 * 2. Anonymizes menu proposals
 * 3. Releases item reservations
 * 4. Deletes profile photos from Storage
 */
export const deleteUserAccount = functions.https.onCall(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    // Validate authentication
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to delete account'
      );
    }

    const userId = request.auth.uid;
    functions.logger.info(`Account deletion requested for user: ${userId}`);

    try {
      // Step 1: Find all groups the user is a member of
      const groupsSnapshot = await db
        .collection('groups')
        .where('memberIds', 'array-contains', userId)
        .get();

      const batch = db.batch();
      const profilePhotosToDelete: string[] = [];

      for (const groupDoc of groupsSnapshot.docs) {
        const groupData = groupDoc.data();
        const groupId = groupDoc.id;

        // Find the user's member data
        const userMember = groupData.members?.find(
          (m: any) => m.userId === userId
        );
        const userName = userMember?.name || 'Former Member';

        // Save profile photo URI for deletion
        if (userMember?.profileImageUri) {
          profilePhotosToDelete.push(userMember.profileImageUri);
        }

        // Step 2: Remove user from members and memberIds arrays
        const updatedMembers = (groupData.members || []).filter(
          (m: any) => m.userId !== userId
        );
        const updatedMemberIds = (groupData.memberIds || []).filter(
          (id: string) => id !== userId
        );

        batch.update(groupDoc.ref, {
          members: updatedMembers,
          memberIds: updatedMemberIds,
        });

        // Step 3: Anonymize menu proposals in this group
        const menusSnapshot = await db
          .collection('groups')
          .doc(groupId)
          .collection('menus')
          .where('proposedBy', '==', userName)
          .get();

        for (const menuDoc of menusSnapshot.docs) {
          batch.update(menuDoc.ref, {
            proposedBy: 'Former Member',
          });
        }

        // Step 4: Release all item reservations in this group
        const allMenusSnapshot = await db
          .collection('groups')
          .doc(groupId)
          .collection('menus')
          .get();

        for (const menuDoc of allMenusSnapshot.docs) {
          const itemsSnapshot = await menuDoc.ref
            .collection('items')
            .where('reservedBy', '==', userName)
            .get();

          for (const itemDoc of itemsSnapshot.docs) {
            batch.update(itemDoc.ref, {
              reservedBy: null,
            });
          }
        }

        // Step 5: Remove from attendees arrays
        const attendeeMenusSnapshot = await db
          .collection('groups')
          .doc(groupId)
          .collection('menus')
          .where('attendees', 'array-contains', { name: userName })
          .get();

        for (const menuDoc of attendeeMenusSnapshot.docs) {
          const menuData = menuDoc.data();
          const updatedAttendees = (menuData.attendees || []).filter(
            (a: any) => a.name !== userName
          );
          batch.update(menuDoc.ref, {
            attendees: updatedAttendees,
          });
        }
      }

      // Commit all Firestore updates
      await batch.commit();
      functions.logger.info('Firestore data updated');

      // Step 6: Delete profile photos from Storage
      if (profilePhotosToDelete.length > 0) {
        const bucket = storage.bucket();
        for (const photoUrl of profilePhotosToDelete) {
          try {
            // Extract file path from URL
            const urlParts = photoUrl.split('/');
            const filePathIndex = urlParts.indexOf('profile-images');
            if (filePathIndex !== -1) {
              const filePath = urlParts.slice(filePathIndex).join('/');
              const file = bucket.file(filePath);
              await file.delete();
              functions.logger.info('Deleted profile photo:', filePath);
            }
          } catch (error) {
            // Log but don't fail the entire operation
            functions.logger.warn('Failed to delete profile photo:', error);
          }
        }
      }

      functions.logger.info(`Account deletion complete for user: ${userId}`);
      return {
        success: true,
        message: 'Account and all associated data have been deleted successfully',
      };
    } catch (error) {
      functions.logger.error('Account deletion failed:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to delete account. Please try again or contact support.'
      );
    }
  }
);

export const generateMenuImage = functions.https.onCall(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (request): Promise<GenerateMenuImageResponse> => {
    const { menuTitle, groupId, userName } = request.data as GenerateMenuImageRequest;

    // Validate input
    if (!menuTitle || !groupId || !userName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: menuTitle, groupId, userName'
      );
    }

    functions.logger.info(`Image generation request from ${userName} for "${menuTitle}"`);

    // Validate group membership
    const isMember = await validateGroupMembership(groupId, userName);
    if (!isMember) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User is not a member of the specified group'
      );
    }

    // Normalize title and check cache
    const normalizedTitle = normalizeMenuTitle(menuTitle);
    const cachedUrl = await checkImageCache(normalizedTitle);

    if (cachedUrl) {
      functions.logger.info('Returning cached image');
      return {
        imageUrl: cachedUrl,
        cached: true,
        budgetExceeded: false,
      };
    }

    // Check budget
    const budgetAvailable = await checkImageGenerationBudget();
    if (!budgetAvailable) {
      functions.logger.warn('Budget cap reached, skipping generation');
      return {
        imageUrl: null,
        cached: false,
        budgetExceeded: true,
      };
    }

    // Get Gemini API key from environment variable
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey || geminiApiKey.includes('your_')) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Gemini API key not configured. Please set GEMINI_API_KEY environment variable.'
      );
    }

    try {
      // Generate image
      const prompt = createImagePrompt(menuTitle);
      functions.logger.info('Prompt:', prompt);

      const imageData = await generateImageWithGemini(prompt, geminiApiKey);
      functions.logger.info('Image generated, type:', imageData.mimeType);

      // Upload to Storage
      const filename = titleToFilename(normalizedTitle);
      const imageUrl = await uploadImageToStorage(
        imageData.base64,
        filename,
        imageData.mimeType
      );

      // Track cost
      await incrementImageGenerationCost();

      // Cache the URL
      await cacheImageUrl(normalizedTitle, imageUrl);

      functions.logger.info('Image generation complete');
      return {
        imageUrl,
        cached: false,
        budgetExceeded: false,
      };
    } catch (error) {
      functions.logger.error('Image generation failed:', error);
      return {
        imageUrl: null,
        cached: false,
        budgetExceeded: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
);
