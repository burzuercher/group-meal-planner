import {
  signInAnonymously as firebaseSignInAnonymously,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  linkWithCredential,
  EmailAuthProvider,
  signOut as firebaseSignOut,
  deleteUser,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Sign in anonymously (zero friction)
 * Called automatically on app launch
 */
export async function signInAnonymously(): Promise<User> {
  try {
    const userCredential = await firebaseSignInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw new Error('Failed to initialize authentication');
  }
}

/**
 * Link anonymous account with email/password for cross-device sync
 * Upgrades anonymous account to permanent account
 */
export async function linkWithEmailAndPassword(
  email: string,
  password: string
): Promise<User> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('No user is currently signed in');
    }

    if (!currentUser.isAnonymous) {
      throw new Error('User account is already linked');
    }

    // Create credential
    const credential = EmailAuthProvider.credential(email, password);

    // Link the credential to the current anonymous user
    const userCredential = await linkWithCredential(currentUser, credential);

    return userCredential.user;
  } catch (error: any) {
    console.error('Error linking account:', error);

    // Provide user-friendly error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already in use by another account');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters');
    } else if (error.code === 'auth/credential-already-in-use') {
      throw new Error('These credentials are already linked to another account');
    }

    throw new Error('Failed to link account. Please try again.');
  }
}

/**
 * Sign in with email/password on a new device
 * Used to recover a linked account
 */
export async function signInWithEmailAndPassword(
  email: string,
  password: string
): Promise<User> {
  try {
    const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Error signing in with email/password:', error);

    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled');
    }

    throw new Error('Failed to sign in. Please try again.');
  }
}

/**
 * Get the currently signed-in user
 */
export function getCurrentUser(): User | null {
  return auth.currentUser;
}

/**
 * Get the current user's ID
 */
export function getCurrentUserId(): string | null {
  return auth.currentUser?.uid || null;
}

/**
 * Check if the current user is anonymous
 */
export function isAnonymous(): boolean {
  return auth.currentUser?.isAnonymous || false;
}

/**
 * Check if the current user has linked credentials (email/password)
 */
export function hasLinkedAccount(): boolean {
  const user = auth.currentUser;
  if (!user) return false;

  // Check if user has email/password provider
  return user.providerData.some(provider => provider.providerId === 'password');
}

/**
 * Get the user's email (if linked)
 */
export function getUserEmail(): string | null {
  return auth.currentUser?.email || null;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Delete the current user's auth account
 * Note: This should only be called after deleting all Firestore data
 */
export async function deleteAuthAccount(): Promise<void> {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('No user is currently signed in');
    }

    await deleteUser(user);
  } catch (error: any) {
    console.error('Error deleting auth account:', error);

    if (error.code === 'auth/requires-recent-login') {
      throw new Error('For security, please sign in again before deleting your account');
    }

    throw new Error('Failed to delete account');
  }
}

/**
 * Listen to authentication state changes
 * Returns unsubscribe function
 */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Wait for auth to be ready
 * Useful for ensuring user is signed in before accessing Firestore
 */
export function waitForAuth(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        reject(new Error('No user signed in'));
      }
    });
  });
}
