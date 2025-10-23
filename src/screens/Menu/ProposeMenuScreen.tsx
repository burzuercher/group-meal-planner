import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Loading } from '../../components';
import { colors, spacing, borderRadius, elevation } from '../../theme';
import { useAppStore } from '../../store';
import { createMenu, getMenuByDate } from '../../services/menuService';
import { RootStackParamList } from '../../types';
import { formatDate, formatDateKey, parseDateKey } from '../../utils/dateUtils';

type ProposeMenuRouteProp = RouteProp<RootStackParamList, 'ProposeMenu'>;
type ProposeMenuNavigationProp = StackNavigationProp<RootStackParamList, 'ProposeMenu'>;

export default function ProposeMenuScreen() {
  const route = useRoute<ProposeMenuRouteProp>();
  const navigation = useNavigation<ProposeMenuNavigationProp>();
  const { currentGroupId, userProfile } = useAppStore();

  const { dateString } = route.params;
  const initialDate = parseDateKey(dateString);

  const [menuName, setMenuName] = useState('');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleProposeMenu = async () => {
    if (!menuName.trim()) {
      setError('Please enter a name for the menu');
      return;
    }

    if (!currentGroupId || !userProfile) {
      setError('Please select a group and ensure you have a profile');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if menu already exists for this date
      const existingMenu = await getMenuByDate(currentGroupId, selectedDate);

      if (existingMenu) {
        Alert.alert(
          'Menu Already Exists',
          `A menu has already been proposed for this date by ${existingMenu.proposedBy}. Would you like to view it instead?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'View Menu',
              onPress: () => {
                navigation.replace('MenuDetails', {
                  menuId: existingMenu.id,
                  dateString: formatDateKey(existingMenu.date),
                });
              },
            },
          ]
        );
        setLoading(false);
        return;
      }

      // Create new menu
      const menu = await createMenu(
        currentGroupId,
        menuName.trim(),
        selectedDate,
        userProfile.name
      );

      // Navigate to menu details to add items
      navigation.replace('MenuDetails', {
        menuId: menu.id,
        dateString: formatDateKey(menu.date),
      });
    } catch (err) {
      console.error('Error proposing menu:', err);
      setError('Failed to propose menu. Please try again.');
      setLoading(false);
    }
  };

  if (loading) {
    return <Loading message="Creating menu..." />;
  }

  return (
    <Screen scroll edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            Propose Menu
          </Text>

          <TouchableOpacity
            style={styles.dateCard}
            onPress={() => setShowDatePicker(true)}
          >
            <Text variant="bodySmall" style={styles.label}>
              Meal Date
            </Text>
            <Text variant="titleLarge" style={styles.date}>
              {formatDate(selectedDate, 'EEEE, MMMM d, yyyy')}
            </Text>
            <Text variant="bodySmall" style={styles.tapHint}>
              Tap to change
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}

          <TextInput
            mode="outlined"
            label="Menu Name *"
            value={menuName}
            onChangeText={(text) => {
              setMenuName(text);
              setError('');
            }}
            placeholder="e.g., Thanksgiving Dinner, Sunday Potluck"
            style={styles.input}
            autoFocus
            error={!!error && !menuName.trim()}
          />

          <View style={styles.infoCard}>
            <Text variant="bodyMedium" style={styles.infoText}>
              After creating the menu, you can:
            </Text>
            <View style={styles.bulletList}>
              <Text variant="bodyMedium" style={styles.bullet}>
                • Add suggested menu items
              </Text>
              <Text variant="bodyMedium" style={styles.bullet}>
                • Reserve items you'll bring
              </Text>
              <Text variant="bodyMedium" style={styles.bullet}>
                • Let others add and reserve items
              </Text>
              <Text variant="bodyMedium" style={styles.bullet}>
                • Set the menu as "Active" when ready
              </Text>
            </View>
          </View>

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
            onPress={handleProposeMenu}
            style={styles.button}
            disabled={loading}
          >
            Create Menu
          </Button>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  content: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xl,
  },
  dateCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation.level1,
  },
  label: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  date: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  tapHint: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  input: {
    marginBottom: spacing.md,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bullet: {
    color: colors.text.secondary,
  },
  errorText: {
    color: colors.error,
    marginTop: spacing.md,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  button: {
    flex: 1,
  },
});
