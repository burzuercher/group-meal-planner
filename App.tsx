import React, { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppState, AppStateStatus } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import { GroupSelectorModal } from './src/components';
import { theme } from './src/theme';
import { useAppStore } from './src/store';

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
    // Load user profile from AsyncStorage on app start
    const initializeApp = async () => {
      // Check if we should clear storage (useful for testing onboarding)
      if (process.env.CLEAR_STORAGE_ON_START === 'true') {
        console.log('CLEAR_STORAGE_ON_START is enabled - clearing AsyncStorage');
        await AsyncStorage.clear();
      }
      loadUserProfile();
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
