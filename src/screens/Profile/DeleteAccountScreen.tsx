import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Screen, Loading } from '../../components';
import { colors, spacing } from '../../theme';
import { useAppStore } from '../../store';
import { updateMemberInfo } from '../../services/groupService';
import { deleteProfileImage } from '../../services/storageService';
import { releaseAllUserReservations, anonymizeUserMenuProposals } from '../../services/menuService';
import { deleteAuthAccount, getCurrentUserId } from '../../services/authService';
import { RootStackParamList } from '../../types';

type DeleteAccountNavigationProp = StackNavigationProp<RootStackParamList, 'DeleteAccount'>;

export default function DeleteAccountScreen() {
  const navigation = useNavigation<DeleteAccountNavigationProp>();
  const { userProfile, clearUserProfile } = useAppStore();

  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmText.toUpperCase() !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    if (!userProfile) {
      setError('No user profile found');
      return;
    }

    // Final confirmation
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setError('');

            try {
              const userId = getCurrentUserId();

              // 1. Release all item reservations across all groups
              for (const group of userProfile.groups) {
                await releaseAllUserReservations(group.groupId, userProfile.name);
              }

              // 2. Anonymize all menu proposals
              for (const group of userProfile.groups) {
                await anonymizeUserMenuProposals(group.groupId, userProfile.name);
              }

              // 3. Remove user from all groups
              for (const group of userProfile.groups) {
                await updateMemberInfo(group.groupId, userProfile.id, {
                  name: '[Deleted User]',
                  profileImageUri: null,
                });
              }

              // 4. Delete profile image if exists
              if (userId) {
                try {
                  await deleteProfileImage(userId);
                } catch (err) {
                  console.warn('Failed to delete profile image:', err);
                }
              }

              // 5. Delete Firebase Auth account
              await deleteAuthAccount();

              // 6. Clear local data
              await AsyncStorage.clear();
              clearUserProfile();

              // Navigate to onboarding
              navigation.reset({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            } catch (err: any) {
              console.error('Error deleting account:', err);
              setError(err.message || 'Failed to delete account. Please try again.');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading message="Deleting account..." />;
  }

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="bodyMedium" style={styles.warning}>
            ⚠️ WARNING: This action is permanent and cannot be undone!
          </Text>

          <Text variant="bodyMedium" style={styles.description}>
            Deleting your account will:
          </Text>

          <View style={styles.bulletList}>
            <Text variant="bodySmall" style={styles.bullet}>
              • Remove you from all groups
            </Text>
            <Text variant="bodySmall" style={styles.bullet}>
              • Anonymize your menu proposals
            </Text>
            <Text variant="bodySmall" style={styles.bullet}>
              • Release all your item reservations
            </Text>
            <Text variant="bodySmall" style={styles.bullet}>
              • Delete your profile photo
            </Text>
            <Text variant="bodySmall" style={styles.bullet}>
              • Delete your authentication credentials
            </Text>
          </View>

          <Text variant="bodyMedium" style={styles.confirmPrompt}>
            To confirm, type <Text style={styles.bold}>DELETE</Text> below:
          </Text>

          <TextInput
            mode="outlined"
            value={confirmText}
            onChangeText={(text) => {
              setConfirmText(text);
              setError('');
            }}
            placeholder="Type DELETE"
            autoCapitalize="characters"
            style={styles.input}
            error={!!error}
            autoFocus
          />

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
            onPress={handleDeleteAccount}
            style={styles.button}
            buttonColor={colors.error}
            textColor={colors.text.onPrimary}
            disabled={loading}
          >
            Delete Forever
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
  warning: {
    color: colors.error,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  description: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  bulletList: {
    marginLeft: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  bullet: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  confirmPrompt: {
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  bold: {
    fontWeight: 'bold',
  },
  input: {
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
