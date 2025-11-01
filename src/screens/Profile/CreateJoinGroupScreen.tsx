import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Loading } from '../../components';
import { colors, spacing } from '../../theme';
import { useAppStore } from '../../store';
import { createGroup, joinGroup } from '../../services/groupService';
import { RootStackParamList, GroupMembership } from '../../types';

type CreateJoinGroupRouteProp = RouteProp<RootStackParamList, 'CreateJoinGroup'>;
type CreateJoinGroupNavigationProp = StackNavigationProp<RootStackParamList, 'CreateJoinGroup'>;

export default function CreateJoinGroupScreen() {
  const route = useRoute<CreateJoinGroupRouteProp>();
  const navigation = useNavigation<CreateJoinGroupNavigationProp>();
  const { userProfile, setUserProfile, setCurrentGroup } = useAppStore();

  const { mode } = route.params;

  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    if (!userProfile) {
      setError('Missing profile information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const creator = {
        userId: userProfile.userId,
        name: userProfile.name,
        profileImageUri: userProfile.profileImageUri,
        partySize: userProfile.partySize,
        joinedAt: new Date(),
      };

      const { group, code } = await createGroup(groupName.trim(), creator);

      // Update local profile with new group
      const updatedGroups: GroupMembership[] = [
        ...userProfile.joinedGroups,
        {
          groupId: group.id,
          groupName: groupName.trim(),
          code,
          joinedAt: new Date(),
        },
      ];

      setUserProfile({
        ...userProfile,
        joinedGroups: updatedGroups,
      });

      setCurrentGroup(group.id);
      navigation.goBack();
    } catch (err) {
      console.error('Error creating group:', err);
      setError('Failed to create group. Please try again.');
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      setError('Please enter a group code');
      return;
    }

    if (!userProfile) {
      setError('Missing profile information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const member = {
        userId: userProfile.userId,
        name: userProfile.name,
        profileImageUri: userProfile.profileImageUri,
        partySize: userProfile.partySize,
        joinedAt: new Date(),
      };

      const group = await joinGroup(groupCode.trim(), member);

      // Update local profile with new group
      const updatedGroups: GroupMembership[] = [
        ...userProfile.joinedGroups,
        {
          groupId: group.id,
          groupName: group.name,
          code: group.code,
          joinedAt: new Date(),
        },
      ];

      setUserProfile({
        ...userProfile,
        joinedGroups: updatedGroups,
      });

      setCurrentGroup(group.id);
      navigation.goBack();
    } catch (err: any) {
      console.error('Error joining group:', err);
      setError(err.message || 'Failed to join group. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message={mode === 'create' ? 'Creating group...' : 'Joining group...'} />;
  }

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          {mode === 'create' ? (
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
                style={styles.input}
                error={!!error}
                autoFocus
              />

              <Text variant="bodySmall" style={styles.hint}>
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
                style={styles.input}
                error={!!error}
                autoFocus
              />

              <Text variant="bodySmall" style={styles.hint}>
                Enter the 6-character code shared by your group
              </Text>
            </>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={mode === 'create' ? handleCreateGroup : handleJoinGroup}
            style={styles.button}
            disabled={loading}
          >
            {mode === 'create' ? 'Create' : 'Join'}
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  content: {
    // No flex here to avoid pushing buttons down
  },
  input: {
    marginBottom: spacing.md,
  },
  hint: {
    color: colors.text.secondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  button: {
    flex: 1,
  },
});
