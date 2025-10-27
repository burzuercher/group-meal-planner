import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { CLEAR_STORAGE_ON_START } from '@env';
import AppNavigator from './src/navigation/AppNavigator';
import { GroupSelectorModal } from './src/components';
import { theme } from './src/theme';
import { useAppStore } from './src/store';
import { signInAnonymously, getCurrentUser, onAuthStateChange } from './src/services/authService';

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const THREE_HOURS_IN_MS = 3 * 60 * 60 * 1000;

export default function App() {
  const {
    loadUserProfile,
    userProfile,
    currentGroupId,
    lastGroupSelectionTime,
    setCurrentGroup,
  } = useAppStore();

  const [showGroupSelector, setShowGroupSelector] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const backgroundTime = useRef<Date | null>(null);

  useEffect(() => {
    // Initialize authentication and load user profile on app start
    const initializeApp = async () => {
      try {
        // Check if we should clear storage (useful for testing onboarding)
        if (CLEAR_STORAGE_ON_START === 'true') {
          console.log('CLEAR_STORAGE_ON_START is enabled - clearing AsyncStorage');
          await AsyncStorage.clear();
        }

        // Step 1: Ensure user is authenticated (anonymous or linked account)
        const currentUser = getCurrentUser();
        if (!currentUser) {
          // No user signed in - sign in anonymously (zero friction!)
          console.log('No user signed in - signing in anonymously');
          await signInAnonymously();
          console.log('Anonymous sign-in successful');
        } else {
          console.log('User already authenticated:', currentUser.uid);
        }

        // Step 2: Load user profile from AsyncStorage
        loadUserProfile();
      } catch (error) {
        console.error('Error initializing app:', error);
        // Still try to load profile even if auth fails
        loadUserProfile();
      }
    };

    initializeApp();
  }, []);

  useEffect(() => {
    // Listen for app state changes (foreground/background)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // App is going to background
      if (
        appState.current.match(/active|inactive/) &&
        nextAppState === 'background'
      ) {
        backgroundTime.current = new Date();
      }

      // App is coming to foreground
      if (
        appState.current.match(/background/) &&
        nextAppState === 'active'
      ) {
        checkShouldShowGroupSelector();
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [userProfile, currentGroupId, lastGroupSelectionTime]);

  useEffect(() => {
    // Handle notification responses (when user taps a notification)
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;

      // TODO: Navigate to menu details screen when notification is tapped
      // This will be implemented once we integrate with navigation
      console.log('Notification tapped:', data);

      // Example navigation (to be implemented):
      // if (data.menuId) {
      //   navigation.navigate('MenuDetails', { menuId: data.menuId, dateString: ... });
      // }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const checkShouldShowGroupSelector = () => {
    // Only show if user has multiple groups
    if (!userProfile || !userProfile.joinedGroups || userProfile.joinedGroups.length <= 1) {
      return;
    }

    // Check if 3+ hours have passed since last selection
    const now = new Date();
    const timeSinceLastSelection = lastGroupSelectionTime
      ? now.getTime() - lastGroupSelectionTime.getTime()
      : Infinity;

    // Only prompt if 3+ hours have passed
    if (timeSinceLastSelection >= THREE_HOURS_IN_MS) {
      setShowGroupSelector(true);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setCurrentGroup(groupId);
    setShowGroupSelector(false);
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar style="auto" />
        <AppNavigator />

        {userProfile && (
          <GroupSelectorModal
            visible={showGroupSelector}
            groups={userProfile.joinedGroups || []}
            currentGroupId={currentGroupId}
            onSelectGroup={handleSelectGroup}
            onDismiss={() => setShowGroupSelector(false)}
          />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}
