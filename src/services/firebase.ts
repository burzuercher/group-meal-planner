import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY_HERE",
  authDomain: "lifegroup-menu-planner.firebaseapp.com",
  projectId: "lifegroup-menu-planner",
  storageBucket: "lifegroup-menu-planner.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "1:YOUR_SENDER_ID:web:9cf8fcc2055bdd05a2f4ae",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Note: Push notifications will be implemented using expo-notifications
// instead of Firebase Messaging (which is web-only)

export default app;
