import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../store';
import { UserProfile, GroupMembership, NotificationPreferences } from '../../types';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../services/notificationService';
import { act, renderHook } from '@testing-library/react-hooks';

describe('Feature: App State Management', () => {
  const USER_PROFILE_KEY = '@lifegroup_food:user_profile';
  const CURRENT_GROUP_KEY = '@lifegroup_food:current_group';
  const LAST_GROUP_SELECTION_KEY = '@lifegroup_food:last_group_selection';

  let testProfile: UserProfile;
  let testGroup: GroupMembership;

  beforeEach(async () => {
    // Clear AsyncStorage mock
    (AsyncStorage.clear as jest.Mock).mockClear();
    (AsyncStorage.getItem as jest.Mock).mockClear();
    (AsyncStorage.setItem as jest.Mock).mockClear();
    (AsyncStorage.removeItem as jest.Mock).mockClear();

    // Reset AsyncStorage to empty state
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    // Create test data
    testProfile = {
      name: 'John Doe',
      partySize: { adults: 2, children: 1 },
      joinedGroups: [],
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    };

    testGroup = {
      groupId: 'group-123',
      groupName: 'Test Group',
      code: 'ABC123',
      joinedAt: new Date(),
    };

    // Reset store state
    const { result } = renderHook(() => useAppStore());
    act(() => {
      result.current.userProfile = null;
      result.current.currentGroupId = null;
      result.current.lastGroupSelectionTime = null;
    });
  });

  describe('Feature: Save user profile', () => {
    describe('Given: Valid user profile', () => {
      describe('When: Saving profile', () => {
        it('Then: Should persist to AsyncStorage', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.setUserProfile(testProfile);
          });

          expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            USER_PROFILE_KEY,
            JSON.stringify(testProfile)
          );
        });

        it('And: Should update store state', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.setUserProfile(testProfile);
          });

          expect(result.current.userProfile).toEqual(testProfile);
        });
      });
    });
  });

  describe('Feature: Load user profile on app start', () => {
    describe('Given: Profile exists in AsyncStorage', () => {
      describe('When: Loading profile', () => {
        it('Then: Should load profile into state', async () => {
          (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
            if (key === USER_PROFILE_KEY) {
              return Promise.resolve(JSON.stringify(testProfile));
            }
            return Promise.resolve(null);
          });

          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.loadUserProfile();
          });

          expect(result.current.userProfile).toEqual(testProfile);
        });
      });
    });

    describe('Given: Single group in profile and no current group set', () => {
      describe('When: Loading profile', () => {
        it('Then: Should auto-select the single group', async () => {
          const profileWithGroup = {
            ...testProfile,
            joinedGroups: [testGroup],
          };

          (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
            if (key === USER_PROFILE_KEY) {
              return Promise.resolve(JSON.stringify(profileWithGroup));
            }
            return Promise.resolve(null);
          });

          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.loadUserProfile();
          });

          expect(result.current.currentGroupId).toBe('group-123');
          expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            CURRENT_GROUP_KEY,
            'group-123'
          );
        });
      });
    });

    describe('Given: Multiple groups but current group already set', () => {
      describe('When: Loading profile', () => {
        it('Then: Should not auto-select', async () => {
          const profileWithGroups = {
            ...testProfile,
            joinedGroups: [testGroup, { ...testGroup, groupId: 'group-456' }],
          };

          (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
            if (key === USER_PROFILE_KEY) {
              return Promise.resolve(JSON.stringify(profileWithGroups));
            }
            if (key === CURRENT_GROUP_KEY) {
              return Promise.resolve('group-456');
            }
            return Promise.resolve(null);
          });

          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.loadUserProfile();
          });

          expect(result.current.currentGroupId).toBe('group-456');
        });
      });
    });

    describe('Given: No profile in AsyncStorage', () => {
      describe('When: Loading profile', () => {
        it('Then: Profile should remain null', async () => {
          (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.loadUserProfile();
          });

          expect(result.current.userProfile).toBeNull();
        });
      });
    });
  });

  describe('Feature: Update profile information', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useAppStore());
      await act(async () => {
        await result.current.setUserProfile(testProfile);
      });
    });

    describe('Given: Existing user profile', () => {
      describe('When: Updating name', () => {
        it('Then: Should update name and persist', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.updateProfileInfo({ name: 'Jane Smith' });
          });

          expect(result.current.userProfile?.name).toBe('Jane Smith');
          expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            USER_PROFILE_KEY,
            expect.stringContaining('Jane Smith')
          );
        });
      });

      describe('When: Updating party size', () => {
        it('Then: Should update party size and persist', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.updateProfileInfo({
              partySize: { adults: 3, children: 2 },
            });
          });

          expect(result.current.userProfile?.partySize).toEqual({
            adults: 3,
            children: 2,
          });
        });
      });

      describe('When: Updating notification preferences', () => {
        it('Then: Should update preferences and persist', async () => {
          const { result } = renderHook(() => useAppStore());

          const newPreferences: NotificationPreferences = {
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            enabled: false,
          };

          await act(async () => {
            await result.current.updateProfileInfo({
              notificationPreferences: newPreferences,
            });
          });

          expect(result.current.userProfile?.notificationPreferences?.enabled).toBe(
            false
          );
        });
      });

      describe('When: Updating profile image', () => {
        it('Then: Should update image URI and persist', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.updateProfileInfo({
              profileImageUri: 'https://example.com/image.jpg',
            });
          });

          expect(result.current.userProfile?.profileImageUri).toBe(
            'https://example.com/image.jpg'
          );
        });
      });
    });

    describe('Given: No user profile', () => {
      describe('When: Attempting to update', () => {
        it('Then: Should not throw error', async () => {
          const { result } = renderHook(() => useAppStore());

          // Reset profile to null
          act(() => {
            result.current.userProfile = null;
          });

          await act(async () => {
            await expect(
              result.current.updateProfileInfo({ name: 'Test' })
            ).resolves.not.toThrow();
          });
        });
      });
    });
  });

  describe('Feature: Add group to profile', () => {
    beforeEach(async () => {
      const { result } = renderHook(() => useAppStore());
      await act(async () => {
        await result.current.setUserProfile(testProfile);
      });
    });

    describe('Given: User profile exists', () => {
      describe('When: Adding a new group', () => {
        it('Then: Should add group to joined groups', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.addGroup(testGroup);
          });

          expect(result.current.userProfile?.joinedGroups).toHaveLength(1);
          expect(result.current.userProfile?.joinedGroups[0]).toEqual(testGroup);
        });

        it('And: Should set as current group', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.addGroup(testGroup);
          });

          expect(result.current.currentGroupId).toBe('group-123');
        });

        it('And: Should persist to AsyncStorage', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.addGroup(testGroup);
          });

          expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            USER_PROFILE_KEY,
            expect.stringContaining('group-123')
          );
          expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            CURRENT_GROUP_KEY,
            'group-123'
          );
        });
      });

      describe('When: Adding multiple groups', () => {
        it('Then: Should append to existing groups', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.addGroup(testGroup);
            await result.current.addGroup({
              ...testGroup,
              groupId: 'group-456',
              groupName: 'Second Group',
            });
          });

          expect(result.current.userProfile?.joinedGroups).toHaveLength(2);
        });
      });
    });
  });

  describe('Feature: Switch current group', () => {
    beforeEach(async () => {
      const profileWithGroups = {
        ...testProfile,
        joinedGroups: [
          testGroup,
          { ...testGroup, groupId: 'group-456', groupName: 'Second Group' },
        ],
      };

      const { result } = renderHook(() => useAppStore());
      await act(async () => {
        await result.current.setUserProfile(profileWithGroups);
      });
    });

    describe('Given: User has multiple groups', () => {
      describe('When: Switching to different group', () => {
        it('Then: Should update current group ID', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.setCurrentGroup('group-456');
          });

          expect(result.current.currentGroupId).toBe('group-456');
        });

        it('And: Should persist selection to AsyncStorage', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.setCurrentGroup('group-456');
          });

          expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            CURRENT_GROUP_KEY,
            'group-456'
          );
        });

        it('And: Should update last selection time', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.setCurrentGroup('group-456');
          });

          expect(result.current.lastGroupSelectionTime).toBeInstanceOf(Date);
          expect(AsyncStorage.setItem).toHaveBeenCalledWith(
            LAST_GROUP_SELECTION_KEY,
            expect.any(String)
          );
        });
      });
    });
  });

  describe('Feature: Remove group from profile', () => {
    beforeEach(async () => {
      const profileWithGroups = {
        ...testProfile,
        joinedGroups: [
          testGroup,
          { ...testGroup, groupId: 'group-456', groupName: 'Second Group' },
        ],
      };

      const { result } = renderHook(() => useAppStore());
      await act(async () => {
        await result.current.setUserProfile(profileWithGroups);
        await result.current.setCurrentGroup('group-123');
      });
    });

    describe('Given: User has multiple groups', () => {
      describe('When: Removing non-current group', () => {
        it('Then: Should remove group from list', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.removeGroup('group-456');
          });

          expect(result.current.userProfile?.joinedGroups).toHaveLength(1);
          expect(result.current.userProfile?.joinedGroups[0].groupId).toBe(
            'group-123'
          );
        });

        it('And: Should keep current group unchanged', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.removeGroup('group-456');
          });

          expect(result.current.currentGroupId).toBe('group-123');
        });
      });

      describe('When: Removing current group', () => {
        it('Then: Should switch to first available group', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.removeGroup('group-123');
          });

          expect(result.current.currentGroupId).toBe('group-456');
        });
      });
    });

    describe('Given: User has only one group', () => {
      beforeEach(async () => {
        const profileWithOneGroup = {
          ...testProfile,
          joinedGroups: [testGroup],
        };

        const { result } = renderHook(() => useAppStore());
        await act(async () => {
          await result.current.setUserProfile(profileWithOneGroup);
          await result.current.setCurrentGroup('group-123');
        });
      });

      describe('When: Removing the only group', () => {
        it('Then: Should set current group to null', async () => {
          const { result } = renderHook(() => useAppStore());

          await act(async () => {
            await result.current.removeGroup('group-123');
          });

          expect(result.current.userProfile?.joinedGroups).toHaveLength(0);
          expect(result.current.currentGroupId).toBeNull();
        });
      });
    });
  });
});
