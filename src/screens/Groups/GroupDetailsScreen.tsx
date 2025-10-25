import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, Share } from 'react-native';
import { Text, Button, IconButton, Dialog, Portal, TextInput, Divider, Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Loading, EmptyState, Avatar } from '../../components';
import { colors, spacing, borderRadius, elevation } from '../../theme';
import { useAppStore } from '../../store';
import { getGroupById, updateGroupName, removeMemberFromGroup } from '../../services/groupService';
import { Group, RootStackParamList } from '../../types';
import { formatDate } from '../../utils/dateUtils';

type GroupDetailsRouteProp = RouteProp<RootStackParamList, 'GroupDetails'>;
type GroupDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'GroupDetails'>;

export default function GroupDetailsScreen() {
  const route = useRoute<GroupDetailsRouteProp>();
  const navigation = useNavigation<GroupDetailsNavigationProp>();
  const { userProfile } = useAppStore();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const { groupId } = route.params;

  const loadGroupData = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) {
      setLoading(true);
    }

    try {
      const groupData = await getGroupById(groupId);
      setGroup(groupData);
    } catch (error) {
      console.error('Error loading group:', error);
      Alert.alert('Error', 'Failed to load group details');
    } finally {
      if (!isRefreshing) {
        setLoading(false);
      }
    }
  }, [groupId]);

  useFocusEffect(
    useCallback(() => {
      loadGroupData();
    }, [loadGroupData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroupData(true);
    setRefreshing(false);
  };

  const handleEditName = () => {
    if (!group) return;
    setNewGroupName(group.name);
    setError('');
    setEditNameVisible(true);
  };

  const handleSaveGroupName = async () => {
    if (newGroupName.trim().length < 2) {
      setError('Group name must be at least 2 characters');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await updateGroupName(groupId, newGroupName.trim());

      // Update local state
      if (group) {
        setGroup({
          ...group,
          name: newGroupName.trim(),
        });
      }

      setEditNameVisible(false);
      Alert.alert('Success', 'Group name has been updated');
    } catch (err) {
      console.error('Error updating group name:', err);
      setError('Failed to update group name. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleShareCode = async () => {
    if (!group) return;

    try {
      await Share.share({
        message: `Join my "${group.name}" group on LifeGroup Food!\n\nUse code: ${group.code}`,
        title: 'Join My Group',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleRemoveMember = (memberName: string) => {
    if (!group || !userProfile) return;

    // Prevent removing yourself
    if (memberName === userProfile.name) {
      Alert.alert(
        'Cannot Remove Yourself',
        'Use the "Leave Group" option from the Profile screen to leave this group.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              await removeMemberFromGroup(groupId, memberName);

              // Update local state
              if (group) {
                setGroup({
                  ...group,
                  members: group.members.filter((m) => m.name !== memberName),
                });
              }

              Alert.alert('Success', `${memberName} has been removed from the group`);
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Failed to remove member. Please try again.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading message="Loading group details..." />;
  }

  if (!group) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="account-group-outline"
          title="Group Not Found"
          message="This group no longer exists"
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerContent}>
              <View style={styles.nameRow}>
                <Text variant="headlineSmall" style={styles.headerTitle}>
                  {group.name}
                </Text>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={handleEditName}
                  style={styles.editButton}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Group Info Section */}
        <View style={styles.infoSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Group Information
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="key"
                  size={20}
                  color={colors.text.secondary}
                />
                <View style={styles.infoTextContainer}>
                  <Text variant="bodySmall" style={styles.infoLabel}>
                    Group Code
                  </Text>
                  <Text variant="titleMedium" style={styles.infoValue}>
                    {group.code}
                  </Text>
                </View>
                <IconButton
                  icon="share-variant"
                  size={20}
                  onPress={handleShareCode}
                  style={styles.shareButton}
                />
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoItem}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color={colors.text.secondary}
                />
                <View style={styles.infoTextContainer}>
                  <Text variant="bodySmall" style={styles.infoLabel}>
                    Created
                  </Text>
                  <Text variant="bodyMedium" style={styles.infoValue}>
                    {formatDate(group.createdAt, 'MMMM d, yyyy')}
                  </Text>
                </View>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.infoItem}>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={20}
                  color={colors.text.secondary}
                />
                <View style={styles.infoTextContainer}>
                  <Text variant="bodySmall" style={styles.infoLabel}>
                    Total Members
                  </Text>
                  <Text variant="bodyMedium" style={styles.infoValue}>
                    {group.members.length}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Members Section */}
        <View style={styles.membersSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Members
          </Text>

          {group.members.length === 0 ? (
            <EmptyState
              icon="account-group-outline"
              title="No Members"
              message="This group has no members"
            />
          ) : (
            <View style={styles.membersList}>
              {group.members.map((member, index) => {
                const isCurrentUser = member.name === userProfile?.name;
                return (
                  <Card key={index} style={styles.memberCard}>
                    <Card.Content>
                      <View style={styles.memberRow}>
                        <Avatar
                          imageUri={member.profileImageUri}
                          name={member.name}
                          size={48}
                          style={styles.memberAvatar}
                        />
                        <View style={styles.memberInfo}>
                          <Text variant="titleMedium" style={styles.memberName}>
                            {member.name}
                            {isCurrentUser && (
                              <Text style={styles.youLabel}> (You)</Text>
                            )}
                          </Text>
                          <View style={styles.memberDetails}>
                            <MaterialCommunityIcons
                              name="account-group"
                              size={14}
                              color={colors.text.secondary}
                            />
                            <Text variant="bodySmall" style={styles.memberDetailText}>
                              {member.partySize.adults} adult{member.partySize.adults !== 1 ? 's' : ''}
                              {member.partySize.children > 0 && `, ${member.partySize.children} ${member.partySize.children === 1 ? 'child' : 'children'}`}
                            </Text>
                          </View>
                          <Text variant="bodySmall" style={styles.joinedDate}>
                            Joined {formatDate(member.joinedAt, 'MMM d, yyyy')}
                          </Text>
                        </View>
                        {!isCurrentUser && (
                          <IconButton
                            icon="close"
                            size={20}
                            onPress={() => handleRemoveMember(member.name)}
                            disabled={processing}
                            style={styles.removeButton}
                          />
                        )}
                      </View>
                    </Card.Content>
                  </Card>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Edit Name Dialog */}
      <Portal>
        <Dialog visible={editNameVisible} onDismiss={() => setEditNameVisible(false)}>
          <Dialog.Title>Edit Group Name</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Group Name"
              value={newGroupName}
              onChangeText={(text) => {
                setNewGroupName(text);
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
              onPress={handleSaveGroupName}
              loading={processing}
              disabled={processing}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  editButton: {
    margin: 0,
  },
  infoSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoGrid: {
    gap: spacing.sm,
  },
  infoItem: {
    paddingVertical: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  shareButton: {
    margin: 0,
  },
  divider: {
    marginVertical: spacing.xs,
  },
  membersSection: {
    padding: spacing.lg,
  },
  membersList: {
    gap: spacing.md,
  },
  memberCard: {
    borderRadius: borderRadius.lg,
    ...elevation.level1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  memberAvatar: {
    marginRight: spacing.xs,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  youLabel: {
    color: colors.primary,
    fontWeight: '600',
  },
  memberDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  memberDetailText: {
    color: colors.text.secondary,
  },
  joinedDate: {
    color: colors.text.secondary,
  },
  removeButton: {
    margin: 0,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.sm,
  },
});
