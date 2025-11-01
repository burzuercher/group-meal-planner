import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Loading } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store';
import { updateMemberInfo } from '../../services/groupService';
import { RootStackParamList } from '../../types';

type EditNameRouteProp = RouteProp<RootStackParamList, 'EditName'>;
type EditNameNavigationProp = StackNavigationProp<RootStackParamList, 'EditName'>;

export default function EditNameScreen() {
  const route = useRoute<EditNameRouteProp>();
  const navigation = useNavigation<EditNameNavigationProp>();
  const { currentGroupId, userProfile, setUserProfile } = useAppStore();

  const { currentName } = route.params;

  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!currentGroupId || !userProfile) {
      setError('Missing group or profile information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update in all groups
      await Promise.all(
        userProfile.groups.map((groupId) =>
          updateMemberInfo(groupId, userProfile.id, { name: name.trim() })
        )
      );

      // Update local profile
      setUserProfile({
        ...userProfile,
        name: name.trim(),
      });

      navigation.goBack();
    } catch (err) {
      console.error('Error updating name:', err);
      setError('Failed to update name. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Updating name..." />;
  }

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          <TextInput
            mode="outlined"
            label="Your Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError('');
            }}
            placeholder="Enter your name"
            style={styles.input}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            error={!!error}
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
            onPress={handleSave}
            style={styles.button}
            disabled={loading}
          >
            Save
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
