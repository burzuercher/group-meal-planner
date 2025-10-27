import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Share, TouchableOpacity, Linking, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  IconButton,
  Dialog,
  Portal,
  TextInput,
  Chip,
  Menu,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, EmptyState, Loading, Avatar, PartySizeInput, NotificationSettingsCard } from '../../components';
import { colors, spacing, borderRadius, elevation, gradients } from '../../theme';
import { useAppStore } from '../../store';
import { createGroup, joinGroup, getGroupById, updateMemberInfo } from '../../services/groupService';
import { uploadProfileImage } from '../../services/storageService';
import { requestNotificationPermissions, DEFAULT_NOTIFICATION_PREFERENCES } from '../../services/notificationService';
import { isAnonymous, hasLinkedAccount, linkWithEmailAndPassword, getUserEmail, getCurrentUserId, signOut, deleteAuthAccount } from '../../services/authService';
import { Group, GroupMembership, RootStackParamList, NotificationPreferences } from '../../types';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL, SUPPORT_EMAIL, APP_VERSION } from '../../config/constants';
import { functions } from '../../services/firebase';
import { httpsCallable } from 'firebase/functions';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { userProfile, currentGroupId, addGroup, setCurrentGroup, removeGroup, updateProfileInfo } =
    useAppStore();

  const [groups, setGroups] = useState<(GroupMembership & { memberCount: number })[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  // Profile editing state
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editPartySizeVisible, setEditPartySizeVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAdults, setNewAdults] = useState(1);
  const [newChildren, setNewChildren] = useState(0);

  // Account linking state
  const [linkAccountVisible, setLinkAccountVisible] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Delete account state
  const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    loadGroups();
    syncProfileToGroups();
  }, [userProfile]);

  const syncProfileToGroups = async () => {
    // Sync current profile data to all Firestore groups
    // This ensures Firestore has the latest party size and profile image
    if (!userProfile?.joinedGroups) return;

    try {
      await Promise.allSettled(
        userProfile.joinedGroups.map((group) =>
          updateMemberInfo(group.groupId, userProfile.name, {
            partySize: userProfile.partySize,
            ...(userProfile.profileImageUri && { profileImageUri: userProfile.profileImageUri }),
          })
        )
      );
    } catch (error) {
      console.error('Error syncing profile to groups:', error);
      // Fail silently - this is a background sync
    }
  };

  const loadGroups = async () => {
    if (!userProfile?.joinedGroups) {
      setLoading(false);
      return;
    }

    try {
      const groupsWithDetails = await Promise.all(
        userProfile.joinedGroups.map(async (membership) => {
          try {
            const group = await getGroupById(membership.groupId);
            return {
              ...membership,
              memberCount: group?.members.length || 0,
            };
          } catch (error) {
            console.error('Error loading group:', error);
            return {
              ...membership,
              memberCount: 0,
            };
          }
        })
      );

      setGroups(groupsWithDetails);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (groupName.trim().length < 2) {
      setError('Please enter a group name (at least 2 characters)');
      return;
    }

    if (!userProfile) return;

    setProcessing(true);
    setError('');

    try {
      // Get current user ID
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated. Please restart the app.');
      }

      // Create group member object from user profile (only include profileImageUri if it exists)
      const memberData = {
        userId,
        name: userProfile.name,
        ...(userProfile.profileImageUri && { profileImageUri: userProfile.profileImageUri }),
        partySize: userProfile.partySize,
        joinedAt: new Date(),
      };

      const { group, code } = await createGroup(groupName.trim(), memberData);

      await addGroup({
        groupId: group.id,
        groupName: group.name,
        code: code,
        joinedAt: new Date(),
      });

      setDialogVisible(false);
      setGroupName('');
      loadGroups();

      // Show success message with code
      Alert.alert(
        'Group Created!',
        `Your group code is: ${code}\n\nShare this code with others to invite them to your group.`,
        [
          {
            text: 'Share Code',
            onPress: () => shareGroupCode(group.name, code),
          },
          { text: 'OK' },
        ]
      );
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleJoinGroup = async () => {
    if (groupCode.trim().length !== 6) {
      setError('Please enter a valid 6-character group code');
      return;
    }

    if (!userProfile) return;

    setProcessing(true);
    setError('');

    try {
      // Get current user ID
      const userId = getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated. Please restart the app.');
      }

      // Create group member object from user profile (only include profileImageUri if it exists)
      const memberData = {
        userId,
        name: userProfile.name,
        ...(userProfile.profileImageUri && { profileImageUri: userProfile.profileImageUri }),
        partySize: userProfile.partySize,
        joinedAt: new Date(),
      };

      const group = await joinGroup(groupCode.trim().toUpperCase(), memberData);

      await addGroup({
        groupId: group.id,
        groupName: group.name,
        code: group.code,
        joinedAt: new Date(),
      });

      setDialogVisible(false);
      setGroupCode('');
      loadGroups();

      Alert.alert('Success!', `You've joined ${group.name}`);
    } catch (err) {
      console.error('Error joining group:', err);
      if (err instanceof Error && err.message === 'Group not found') {
        setError('Group not found. Please check the code and try again.');
      } else {
        setError('Failed to join group. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const shareGroupCode = async (groupName: string, code: string) => {
    try {
      await Share.share({
        message: `Join my "${groupName}" group on LifeGroup Food!\n\nUse code: ${code}`,
        title: 'Join My Group',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRemoveGroup = (group: GroupMembership) => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${group.groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await removeGroup(group.groupId);
            loadGroups();
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear your profile and all local data. You will need to go through onboarding again.\n\nNote: This only clears LOCAL data. Firebase data will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              // Force reload by clearing state
              window.location.reload();
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const openDialog = (mode: 'create' | 'join') => {
    setDialogMode(mode);
    setError('');
    setGroupName('');
    setGroupCode('');
    setDialogVisible(true);
  };

  // Profile editing handlers
  const handleEditName = () => {
    if (!userProfile) return;
    setNewName(userProfile.name);
    setEditNameVisible(true);
  };

  const handleSaveName = async () => {
    if (newName.trim().length < 2) {
      setError('Please enter a name (at least 2 characters)');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await updateProfileInfo({ name: newName.trim() });
      setEditNameVisible(false);
      Alert.alert('Success', 'Your name has been updated');
    } catch (err) {
      console.error('Error updating name:', err);
      setError('Failed to update name. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleChangePhoto = async () => {
    if (!userProfile) return;

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permission required', 'Please allow access to your photos to change your profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setProcessing(true);

        try {
          const userId = `${userProfile.name}_${Date.now()}`;
          const uploadedImageUri = await uploadProfileImage(userId, result.assets[0].uri);

          // Update local profile
          await updateProfileInfo({ profileImageUri: uploadedImageUri });

          // Sync to all groups in Firestore
          if (userProfile?.joinedGroups) {
            await Promise.allSettled(
              userProfile.joinedGroups.map((group) =>
                updateMemberInfo(group.groupId, userProfile.name, { profileImageUri: uploadedImageUri })
              )
            );
          }

          Alert.alert('Success', 'Your profile photo has been updated');
        } catch (uploadError) {
          console.error('Failed to upload profile image:', uploadError);
          Alert.alert('Error', 'Failed to update profile photo. Please try again.');
        } finally {
          setProcessing(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleEditPartySize = () => {
    if (!userProfile) return;
    setNewAdults(userProfile.partySize.adults);
    setNewChildren(userProfile.partySize.children);
    setEditPartySizeVisible(true);
  };

  const handleSavePartySize = async () => {
    if (newAdults < 1) {
      setError('You must have at least 1 adult');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const newPartySize = { adults: newAdults, children: newChildren };

      // Update local profile
      await updateProfileInfo({ partySize: newPartySize });

      // Sync to all groups in Firestore
      if (userProfile?.joinedGroups) {
        await Promise.allSettled(
          userProfile.joinedGroups.map((group) =>
            updateMemberInfo(group.groupId, userProfile.name, { partySize: newPartySize })
          )
        );
      }

      setEditPartySizeVisible(false);
      Alert.alert('Success', 'Your party size has been updated');
    } catch (err) {
      console.error('Error updating party size:', err);
      setError('Failed to update party size. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleNotificationPreferencesChange = async (newPreferences: NotificationPreferences) => {
    try {
      // Request permissions if enabling notifications
      if (newPreferences.enabled && !userProfile?.notificationPreferences?.enabled) {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive meal reminders.',
            [{ text: 'OK' }]
          );
          return;
        }
      }

      // Update local profile
      await updateProfileInfo({ notificationPreferences: newPreferences });

      // TODO: Reschedule all notifications based on new preferences
      // This will be implemented when we integrate with menuService
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      Alert.alert('Error', 'Failed to update notification preferences. Please try again.');
    }
  };

  const handleLinkAccount = async () => {
    if (!linkEmail.trim() || !linkPassword.trim()) {
      setError('Please enter both email and password');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(linkEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (linkPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await linkWithEmailAndPassword(linkEmail.trim(), linkPassword);

      setLinkAccountVisible(false);
      setLinkEmail('');
      setLinkPassword('');

      Alert.alert(
        'Account Linked!',
        'Your account is now linked to your email. You can sign in from any device using this email and password.',
        [{ text: 'Great!' }]
      );
    } catch (err) {
      console.error('Error linking account:', err);
      setError(err instanceof Error ? err.message : 'Failed to link account. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleExportData = async () => {
    setProcessing(true);

    try {
      // Gather all user data
      const exportData = {
        profile: userProfile,
        groups: groups,
        exportDate: new Date().toISOString(),
        appVersion: APP_VERSION,
      };

      // Convert to formatted JSON
      const jsonString = JSON.stringify(exportData, null, 2);

      // Share the data
      await Share.share({
        message: jsonString,
        title: 'Group Menu Planner - My Data Export',
      });
    } catch (err) {
      console.error('Error exporting data:', err);
      Alert.alert('Export Failed', 'Failed to export data. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // Call the Cloud Function to delete all user data
      const deleteUserAccountFn = httpsCallable(functions, 'deleteUserAccount');
      const result = await deleteUserAccountFn();

      console.log('Account deletion result:', result.data);

      // Delete Firebase Auth account
      await deleteAuthAccount();

      // Clear local storage
      await AsyncStorage.clear();

      // User will be redirected to onboarding automatically
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been permanently deleted.',
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account. Please contact support.');
      setProcessing(false);
    }
  };

  if (loading) {
    return <Loading message="Loading your groups..." />;
  }

  if (!userProfile) {
    return null;
  }

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={gradients.header.colors}
        start={gradients.header.start}
        end={gradients.header.end}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleChangePhoto} style={styles.profilePhotoContainer}>
            <Avatar
              imageUri={userProfile.profileImageUri}
              name={userProfile.name}
              size={64}
            />
            <View style={styles.cameraIconContainer}>
              <MaterialCommunityIcons
                name="camera"
                size={16}
                color={colors.text.onPrimary}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <TouchableOpacity onPress={handleEditName} style={styles.nameContainer}>
              <Text variant="titleLarge" style={styles.userName}>
                {userProfile.name}
              </Text>
              <MaterialCommunityIcons
                name="pencil"
                size={18}
                color={colors.text.secondary}
                style={styles.editIcon}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleEditPartySize} style={styles.partySizeContainer}>
              <MaterialCommunityIcons
                name="account-group"
                size={16}
                color={colors.text.secondary}
              />
              <Text variant="bodyMedium" style={styles.partySize}>
                {userProfile.partySize.adults} adult{userProfile.partySize.adults !== 1 ? 's' : ''}
                {userProfile.partySize.children > 0 && `, ${userProfile.partySize.children} ${userProfile.partySize.children === 1 ? 'child' : 'children'}`}
              </Text>
              <MaterialCommunityIcons
                name="pencil"
                size={14}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>

          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={24}
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                const emailBody = `Please describe your issue or feedback below:\n\n\n\n---\nApp Version: ${APP_VERSION}\nUser ID: ${getCurrentUserId()}\nDevice: ${Platform.OS}`;
                const subject = 'Group Menu Planner - Issue Report';
                Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`);
              }}
              title="Report an Issue"
              leadingIcon="email-alert"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                handleClearData();
              }}
              title="Clear Data (Dev)"
              leadingIcon="delete-sweep"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                setDeleteAccountVisible(true);
                setDeleteConfirmText('');
                setError('');
              }}
              title="Delete Account"
              leadingIcon="account-remove"
              titleStyle={{ color: colors.error }}
            />
          </Menu>
        </View>
      </LinearGradient>

      {/* Groups Section Header */}
      {groups.length > 0 && (
        <View style={styles.groupsHeader}>
          <Text variant="titleMedium" style={styles.groupsSectionTitle}>
            My Groups
          </Text>
        </View>
      )}
    </>
  );

  const renderFooter = () => (
    <>
      {groups.length > 0 && (
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => openDialog('join')}
            style={styles.button}
            icon="account-plus"
          >
            Join Group
          </Button>
          <Button
            mode="contained"
            onPress={() => openDialog('create')}
            style={styles.button}
            icon="plus"
          >
            Create Group
          </Button>
        </View>
      )}

      {/* Account Status / Linking */}
      <View style={styles.accountSection}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Account
        </Text>
        <Card style={styles.accountCard}>
          <Card.Content>
            {hasLinkedAccount() ? (
              <>
                <View style={styles.accountRow}>
                  <MaterialCommunityIcons name="check-circle" size={24} color={colors.success} />
                  <View style={styles.accountInfo}>
                    <Text variant="titleSmall" style={styles.accountStatusText}>
                      Account Linked
                    </Text>
                    <Text variant="bodySmall" style={styles.accountDetailText}>
                      {getUserEmail()}
                    </Text>
                    <Text variant="bodySmall" style={styles.accountHintText}>
                      You can sign in from any device using this email
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.accountRow}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color={colors.warning} />
                  <View style={styles.accountInfo}>
                    <Text variant="titleSmall" style={styles.accountStatusText}>
                      Temporary Account
                    </Text>
                    <Text variant="bodySmall" style={styles.accountHintText}>
                      Link your account to access it from other devices
                    </Text>
                  </View>
                </View>
                <Button
                  mode="contained"
                  onPress={() => {
                    setLinkAccountVisible(true);
                    setError('');
                  }}
                  style={styles.linkAccountButton}
                  icon="link"
                >
                  Link Account
                </Button>
              </>
            )}

            {/* Export Data Button - GDPR Compliance */}
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.md, paddingTop: spacing.md }}>
              <Text variant="titleSmall" style={styles.accountStatusText}>
                Data Privacy
              </Text>
              <Text variant="bodySmall" style={[styles.accountHintText, { marginBottom: spacing.sm }]}>
                Download all your data in JSON format
              </Text>
              <Button
                mode="outlined"
                onPress={handleExportData}
                disabled={processing}
                icon="download"
                style={{ marginTop: spacing.xs }}
              >
                Export My Data
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Notification Settings */}
      <View style={styles.notificationSection}>
        <Text variant="titleMedium" style={styles.notificationSectionTitle}>
          Notifications
        </Text>
        <NotificationSettingsCard
          preferences={userProfile.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES}
          onPreferencesChange={handleNotificationPreferencesChange}
          loading={processing}
        />
      </View>

      {/* Legal Links Footer */}
      <View style={styles.legalFooter}>
        <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
          <Text variant="bodySmall" style={styles.legalLink}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <Text variant="bodySmall" style={styles.legalSeparator}>
          •
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
          <Text variant="bodySmall" style={styles.legalLink}>
            Terms of Service
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.appVersion}>
        <Text variant="bodySmall" style={styles.versionText}>
          Version {APP_VERSION}
        </Text>
        <Text variant="bodySmall" style={styles.supportText}>
          Support: {SUPPORT_EMAIL}
        </Text>
      </View>
    </>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="account-group-outline"
      title="No Groups Yet"
      message="Create a new group or join an existing one to get started"
      actionLabel="Create Group"
      onAction={() => openDialog('create')}
    />
  );

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.groupId}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            isActive={item.groupId === currentGroupId}
            onPress={() => setCurrentGroup(item.groupId)}
            onEdit={() => navigation.navigate('GroupDetails', { groupId: item.groupId })}
            onShare={() => shareGroupCode(item.groupName, item.code)}
            onRemove={() => handleRemoveGroup(item)}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContent}
        style={styles.container}
      />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>
            {dialogMode === 'create' ? 'Create New Group' : 'Join Group'}
          </Dialog.Title>
          <Dialog.Content>
            {dialogMode === 'create' ? (
              <>
                <TextInput
                  mode="outlined"
                  label="Group Name"
                  value={groupName}
                  onChangeText={(text) => {
                    setGroupName(text);
                    setError('');
                  }}
                  placeholder="e.g., Smith Family"
                  autoCapitalize="words"
                  error={!!error}
                  disabled={processing}
                />
                <Text variant="bodySmall" style={styles.dialogHint}>
                  You'll receive a shareable code to invite others
                </Text>
              </>
            ) : (
              <>
                <TextInput
                  mode="outlined"
                  label="Group Code"
                  value={groupCode}
                  onChangeText={(text) => {
                    setGroupCode(text.toUpperCase());
                    setError('');
                  }}
                  placeholder="ABC123"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={6}
                  error={!!error}
                  disabled={processing}
                />
                <Text variant="bodySmall" style={styles.dialogHint}>
                  Enter the 6-character code shared by your group
                </Text>
              </>
            )}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onPress={dialogMode === 'create' ? handleCreateGroup : handleJoinGroup}
              loading={processing}
              disabled={processing}
            >
              {dialogMode === 'create' ? 'Create' : 'Join'}
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Edit Name Dialog */}
        <Dialog visible={editNameVisible} onDismiss={() => setEditNameVisible(false)}>
          <Dialog.Title>Edit Your Name</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Your Name"
              value={newName}
              onChangeText={(text) => {
                setNewName(text);
                setError('');
              }}
              autoCapitalize="words"
              autoCorrect={false}
              error={!!error}
              disabled={processing}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditNameVisible(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onPress={handleSaveName}
              loading={processing}
              disabled={processing}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Edit Party Size Dialog */}
        <Dialog visible={editPartySizeVisible} onDismiss={() => setEditPartySizeVisible(false)}>
          <Dialog.Title>Edit Party Size</Dialog.Title>
          <Dialog.Content>
            <PartySizeInput
              adults={newAdults}
              children={newChildren}
              onAdultsChange={setNewAdults}
              onChildrenChange={setNewChildren}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditPartySizeVisible(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onPress={handleSavePartySize}
              loading={processing}
              disabled={processing}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Link Account Dialog */}
        <Dialog visible={linkAccountVisible} onDismiss={() => setLinkAccountVisible(false)}>
          <Dialog.Title>Link Your Account</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.linkAccountHint}>
              Link your account to an email and password so you can access your data from any device.
            </Text>
            <TextInput
              mode="outlined"
              label="Email"
              value={linkEmail}
              onChangeText={(text) => {
                setLinkEmail(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={!!error}
              disabled={processing}
              style={styles.linkAccountInput}
            />
            <TextInput
              mode="outlined"
              label="Password"
              value={linkPassword}
              onChangeText={(text) => {
                setLinkPassword(text);
                setError('');
              }}
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              error={!!error}
              disabled={processing}
              style={styles.linkAccountInput}
            />
            <Text variant="bodySmall" style={styles.linkAccountNote}>
              Password must be at least 6 characters
            </Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLinkAccountVisible(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onPress={handleLinkAccount}
              loading={processing}
              disabled={processing}
            >
              Link Account
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Delete Account Dialog */}
        <Dialog visible={deleteAccountVisible} onDismiss={() => setDeleteAccountVisible(false)}>
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ color: colors.error, marginBottom: spacing.md }}>
              ⚠️ WARNING: This action is permanent and cannot be undone!
            </Text>
            <Text variant="bodyMedium" style={styles.linkAccountHint}>
              Deleting your account will:
            </Text>
            <View style={{ marginLeft: spacing.md, marginTop: spacing.sm }}>
              <Text variant="bodySmall" style={styles.linkAccountHint}>
                • Remove you from all groups
              </Text>
              <Text variant="bodySmall" style={styles.linkAccountHint}>
                • Anonymize your menu proposals
              </Text>
              <Text variant="bodySmall" style={styles.linkAccountHint}>
                • Release all your item reservations
              </Text>
              <Text variant="bodySmall" style={styles.linkAccountHint}>
                • Delete your profile photo
              </Text>
              <Text variant="bodySmall" style={styles.linkAccountHint}>
                • Delete your authentication credentials
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>
              To confirm, type <Text style={{ fontWeight: 'bold' }}>DELETE</Text> below:
            </Text>
            <TextInput
              mode="outlined"
              value={deleteConfirmText}
              onChangeText={(text) => {
                setDeleteConfirmText(text);
                setError('');
              }}
              placeholder="Type DELETE"
              autoCapitalize="characters"
              error={!!error}
              disabled={processing}
              style={styles.linkAccountInput}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteAccountVisible(false)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onPress={handleDeleteAccount}
              loading={processing}
              disabled={processing}
              buttonColor={colors.error}
              textColor={colors.text.onPrimary}
            >
              Delete Forever
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

interface GroupCardProps {
  group: GroupMembership & { memberCount: number };
  isActive: boolean;
  onPress: () => void;
  onEdit: () => void;
  onShare: () => void;
  onRemove: () => void;
}

function GroupCard({ group, isActive, onPress, onEdit, onShare, onRemove }: GroupCardProps) {
  return (
    <Card
      style={[styles.card, isActive && styles.activeCard]}
      onPress={onPress}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {group.groupName}
            </Text>
            {isActive && (
              <Chip
                style={styles.activeChip}
                textStyle={styles.activeChipText}
                compact
              >
                Active
              </Chip>
            )}
          </View>
          <View style={styles.cardActions}>
            <IconButton icon="pencil" size={20} onPress={onEdit} />
            <IconButton icon="share-variant" size={20} onPress={onShare} />
            <IconButton icon="close" size={20} onPress={onRemove} />
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.cardDetail}>
            <MaterialCommunityIcons
              name="account-group"
              size={16}
              color={colors.text.secondary}
            />
            <Text variant="bodySmall" style={styles.cardDetailText}>
              {group.memberCount} member{group.memberCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.cardDetail}>
            <MaterialCommunityIcons
              name="key"
              size={16}
              color={colors.text.secondary}
            />
            <Text variant="bodySmall" style={styles.cardDetailText}>
              Code: {group.code}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    flexGrow: 1,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  profilePhotoContainer: {
    position: 'relative',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  profileInfo: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userName: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  editIcon: {
    marginLeft: spacing.xs,
  },
  partySizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  partySize: {
    color: colors.text.secondary,
  },
  accountSection: {
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...elevation.level1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountStatusText: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  accountDetailText: {
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  accountHintText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  linkAccountButton: {
    marginTop: spacing.sm,
  },
  linkAccountHint: {
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  linkAccountInput: {
    marginTop: spacing.md,
  },
  linkAccountNote: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginLeft: spacing.sm,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  notificationSection: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.xxl,
  },
  notificationSectionTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  groupsHeader: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  groupsSectionTitle: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    ...elevation.level1,
  },
  activeCard: {
    backgroundColor: colors.primaryContainer,
    ...elevation.level2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontWeight: '600',
  },
  activeChip: {
    backgroundColor: colors.primary,
  },
  activeChipText: {
    fontSize: 11,
    color: colors.text.onPrimary,
    fontWeight: '600',
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    marginRight: -spacing.sm,
  },
  cardDetails: {
    gap: spacing.sm,
  },
  cardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardDetailText: {
    color: colors.text.secondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  button: {
    flex: 1,
  },
  dialogHint: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.sm,
  },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  legalLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: colors.text.secondary,
  },
  appVersion: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  versionText: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  supportText: {
    color: colors.text.secondary,
    fontSize: 11,
  },
});
