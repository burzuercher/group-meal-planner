import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, GroupMembership } from '../types';

interface AppState {
  // User data
  userProfile: UserProfile | null;
  currentGroupId: string | null;

  // Actions
  setUserProfile: (profile: UserProfile) => Promise<void>;
  addGroup: (group: GroupMembership) => Promise<void>;
  setCurrentGroup: (groupId: string) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  loadUserProfile: () => Promise<void>;
}

const USER_PROFILE_KEY = '@lifegroup_food:user_profile';
const CURRENT_GROUP_KEY = '@lifegroup_food:current_group';

export const useAppStore = create<AppState>((set, get) => ({
  userProfile: null,
  currentGroupId: null,

  setUserProfile: async (profile: UserProfile) => {
    try {
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
      set({ userProfile: profile });
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
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
      await AsyncStorage.setItem(CURRENT_GROUP_KEY, groupId);
      set({ currentGroupId: groupId });
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

  loadUserProfile: async () => {
    try {
      const [profileStr, currentGroupStr] = await Promise.all([
        AsyncStorage.getItem(USER_PROFILE_KEY),
        AsyncStorage.getItem(CURRENT_GROUP_KEY),
      ]);

      if (profileStr) {
        const profile = JSON.parse(profileStr);
        set({ userProfile: profile });
      }

      if (currentGroupStr) {
        set({ currentGroupId: currentGroupStr });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  },
}));
