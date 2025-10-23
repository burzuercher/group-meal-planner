import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert, Share } from 'react-native';
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, EmptyState, Loading } from '../../components';
import { colors, spacing, borderRadius, elevation, gradients } from '../../theme';
import { useAppStore } from '../../store';
import { createGroup, joinGroup, getGroupById } from '../../services/groupService';
import { Group, GroupMembership } from '../../types';

export default function GroupsScreen() {
  const { userProfile, currentGroupId, addGroup, setCurrentGroup, removeGroup } =
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

  useEffect(() => {
    loadGroups();
  }, [userProfile]);

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
      // Create group member object from user profile (only include profileImageUri if it exists)
      const memberData = {
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
      // Create group member object from user profile (only include profileImageUri if it exists)
      const memberData = {
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

  if (loading) {
    return <Loading message="Loading your groups..." />;
  }

  if (!userProfile) {
    return null;
  }

  return (
    <Screen edges={['bottom']}>
      <View style={styles.container}>
        <LinearGradient
          colors={gradients.header.colors}
          start={gradients.header.start}
          end={gradients.header.end}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text variant="bodyMedium" style={styles.greeting}>
                Signed in as
              </Text>
              <Text variant="titleLarge" style={styles.userName}>
                {userProfile.name}
              </Text>
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
                  handleClearData();
                }}
                title="Clear Data (Dev)"
                leadingIcon="delete-sweep"
              />
            </Menu>
          </View>
        </LinearGradient>

        {groups.length === 0 ? (
          <EmptyState
            icon="account-group-outline"
            title="No Groups Yet"
            message="Create a new group or join an existing one to get started"
            actionLabel="Create Group"
            onAction={() => openDialog('create')}
          />
        ) : (
          <>
            <FlatList
              data={groups}
              keyExtractor={(item) => item.groupId}
              renderItem={({ item }) => (
                <GroupCard
                  group={item}
                  isActive={item.groupId === currentGroupId}
                  onPress={() => setCurrentGroup(item.groupId)}
                  onShare={() => shareGroupCode(item.groupName, item.code)}
                  onRemove={() => handleRemoveGroup(item)}
                />
              )}
              contentContainerStyle={styles.list}
            />

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
          </>
        )}
      </View>

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
      </Portal>
    </Screen>
  );
}

interface GroupCardProps {
  group: GroupMembership & { memberCount: number };
  isActive: boolean;
  onPress: () => void;
  onShare: () => void;
  onRemove: () => void;
}

function GroupCard({ group, isActive, onPress, onShare, onRemove }: GroupCardProps) {
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
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    color: colors.text.secondary,
  },
  userName: {
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  list: {
    padding: spacing.md,
  },
  card: {
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
    height: 24,
  },
  activeChipText: {
    fontSize: 11,
    color: colors.text.onPrimary,
    fontWeight: '600',
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
});
