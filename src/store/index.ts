import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, GroupMembership, PartySize, NotificationPreferences } from '../types';

interface AppState {
  // User data
  userProfile: UserProfile | null;
  currentGroupId: string | null;
  lastGroupSelectionTime: Date | null;

  // Actions
  setUserProfile: (profile: UserProfile) => Promise<void>;
  updateProfileInfo: (updates: { name?: string; profileImageUri?: string; partySize?: PartySize; notificationPreferences?: NotificationPreferences }) => Promise<void>;
  addGroup: (group: GroupMembership) => Promise<void>;
  setCurrentGroup: (groupId: string) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  clearUserProfile: () => void;
  loadUserProfile: () => Promise<void>;
}

const USER_PROFILE_KEY = '@lifegroup_food:user_profile';
const CURRENT_GROUP_KEY = '@lifegroup_food:current_group';
const LAST_GROUP_SELECTION_KEY = '@lifegroup_food:last_group_selection';

export const useAppStore = create<AppState>((set, get) => ({
  userProfile: null,
  currentGroupId: null,
  lastGroupSelectionTime: null,

  setUserProfile: async (profile: UserProfile) => {
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      set({ userProfile: profile });
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  },

  updateProfileInfo: async (updates) => {
    const currentProfile = get().userProfile;
    if (!currentProfile) return;

    const updatedProfile = {
      ...currentProfile,
      ...updates,
    };

    await get().setUserProfile(updatedProfile);
  },

  addGroup: async (group: GroupMembership) => {
    const currentProfile = get().userProfile;
    if (!currentProfile) return;

    const updatedProfile = {
      ...currentProfile,
      joinedGroups: [...currentProfile.joinedGroups, group],
    };

    await get().setUserProfile(updatedProfile);
    await get().setCurrentGroup(group.groupId);
  },

  setCurrentGroup: async (groupId: string) => {
    try {
      const now = new Date();
      await Promise.all([
        AsyncStorage.setItem(CURRENT_GROUP_KEY, groupId),
        AsyncStorage.setItem(LAST_GROUP_SELECTION_KEY, now.toISOString()),
      ]);
      set({ currentGroupId: groupId, lastGroupSelectionTime: now });
    } catch (error) {
      console.error('Error setting current group:', error);
    }
  },

  removeGroup: async (groupId: string) => {
    const currentProfile = get().userProfile;
    if (!currentProfile) return;

    const updatedProfile = {
      ...currentProfile,
      joinedGroups: currentProfile.joinedGroups.filter(
        (g) => g.groupId !== groupId
      ),
    };

    await get().setUserProfile(updatedProfile);

    // If removing current group, switch to first available group or null
    if (get().currentGroupId === groupId) {
      const newCurrentGroup = updatedProfile.joinedGroups[0]?.groupId || null;
      if (newCurrentGroup) {
        await get().setCurrentGroup(newCurrentGroup);
      } else {
        set({ currentGroupId: null });
      }
    }
  },

  clearUserProfile: () => {
    set({ userProfile: null, currentGroupId: null, lastGroupSelectionTime: null });
  },

  loadUserProfile: async () => {
    try {
      const [profileStr, currentGroupStr, lastSelectionStr] = await Promise.all([
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(CURRENT_GROUP_KEY),
        AsyncStorage.getItem(LAST_GROUP_SELECTION_KEY),
      ]);

      if (profileStr) {
        const profile = JSON.parse(profileStr);
        set({ userProfile: profile });

        // Auto-select single group if no current group is set
        if (!currentGroupStr && profile.joinedGroups?.length === 1) {
          const singleGroupId = profile.joinedGroups[0].groupId;
          const now = new Date();
          await Promise.all([
            AsyncStorage.setItem(CURRENT_GROUP_KEY, singleGroupId),
            AsyncStorage.setItem(LAST_GROUP_SELECTION_KEY, now.toISOString()),
          ]);
          set({ currentGroupId: singleGroupId, lastGroupSelectionTime: now });
        }
      }

      if (currentGroupStr) {
        set({ currentGroupId: currentGroupStr });
      }

      if (lastSelectionStr) {
        set({ lastGroupSelectionTime: new Date(lastSelectionStr) });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  },
}));
