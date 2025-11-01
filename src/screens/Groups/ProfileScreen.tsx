import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Share, TouchableOpacity, Linking, Platform } from 'react-native';
import {
  Text,
  Card,
  Button,
  IconButton,
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
  const [menuVisible, setMenuVisible] = useState(false);

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

  const [processing, setProcessing] = useState(false);

  const openDialog = (mode: 'create' | 'join') => {
    navigation.navigate('CreateJoinGroup', { mode });
  };

  const handleEditName = () => {
    if (!userProfile) return;
    navigation.navigate('EditName', { currentName: userProfile.name });
  };

  const handleEditPartySize = () => {
    if (!userProfile || !currentGroupId) return;
    const currentGroup = userProfile.joinedGroups.find(g => g.groupId === currentGroupId);
    if (!currentGroup) return;

    navigation.navigate('EditPartySize', {
      currentAdults: currentGroup.partySize?.adults || userProfile.partySize.adults,
      currentChildren: currentGroup.partySize?.children || userProfile.partySize.children,
    });
  };

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile photo.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const userId = getCurrentUserId();
        if (!userId) {
          Alert.alert('Error', 'User not authenticated');
          return;
        }

        setLoading(true);
        const downloadUrl = await uploadProfileImage(userId, imageUri);

        // Update profile in all groups
        if (userProfile) {
          await Promise.all(
            userProfile.joinedGroups.map((group) =>
              updateMemberInfo(group.groupId, userProfile.name, {
                profileImageUri: downloadUrl,
              })
            )
          );

          updateProfileInfo({ profileImageUri: downloadUrl });
        }
        setLoading(false);
      }
    } catch (error) {
      setLoading(false);
      console.error('Error uploading photo:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const shareGroupCode = async (groupName: string, code: string) => {
    try {
      await Share.share({
        message: `Join my "${groupName}" group on LifeGroup Food!\n\nUse code: ${code}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRemoveGroup = async (groupId: string, groupName: string) => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave "${groupName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              if (userProfile) {
                await updateMemberInfo(groupId, userProfile.name, {
                  name: '[Left Group]',
                  profileImageUri: null,
                });
              }
              await removeGroup(groupId);
              if (currentGroupId === groupId) {
                const remainingGroups = userProfile?.joinedGroups.filter(g => g.groupId !== groupId);
                if (remainingGroups && remainingGroups.length > 0) {
                  setCurrentGroup(remainingGroups[0].groupId);
                }
              }
              loadGroups();
              setLoading(false);
            } catch (error) {
              setLoading(false);
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleNotificationPreferencesChange = (preferences: NotificationPreferences) => {
    updateProfileInfo({ notificationPreferences: preferences });
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all local data and reset the app. You will need to create or join groups again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            // App will restart automatically
          },
        },
      ]
    );
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
                navigation.navigate('DeleteAccount');
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
                  onPress={() => navigation.navigate('LinkAccount')}
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
