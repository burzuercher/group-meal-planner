import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Loading, PartySizeInput } from '../../components';
import { colors, spacing } from '../../theme';
import { useAppStore } from '../../store';
import { updateMemberInfo } from '../../services/groupService';
import { RootStackParamList } from '../../types';

type EditPartySizeRouteProp = RouteProp<RootStackParamList, 'EditPartySize'>;
type EditPartySizeNavigationProp = StackNavigationProp<RootStackParamList, 'EditPartySize'>;

export default function EditPartySizeScreen() {
  const route = useRoute<EditPartySizeRouteProp>();
  const navigation = useNavigation<EditPartySizeNavigationProp>();
  const { currentGroupId, userProfile, setUserProfile } = useAppStore();

  const { currentAdults, currentChildren } = route.params;

  const [adults, setAdults] = useState(currentAdults);
  const [children, setChildren] = useState(currentChildren);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!currentGroupId || !userProfile) {
      setError('Missing group or profile information');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Update only in current group
      await updateMemberInfo(currentGroupId, userProfile.id, {
        partySize: { adults, children },
      });

      // Update local profile (update current group's party size)
      const updatedGroups = userProfile.groups.map((group) =>
        group.groupId === currentGroupId
          ? { ...group, partySize: { adults, children } }
          : group
      );

      setUserProfile({
        ...userProfile,
        groups: updatedGroups,
      });

      navigation.goBack();
    } catch (err) {
      console.error('Error updating party size:', err);
      setError('Failed to update party size. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Updating party size..." />;
  }

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          <PartySizeInput
            adults={adults}
            children={children}
            onAdultsChange={setAdults}
            onChildrenChange={setChildren}
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
