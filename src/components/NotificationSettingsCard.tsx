import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Text, Switch, Button, Portal, Dialog } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, elevation } from '../theme';
import { NotificationPreferences } from '../types';
import { sendTestNotification } from '../services/notificationService';

interface NotificationSettingsCardProps {
  preferences: NotificationPreferences;
  onPreferencesChange: (preferences: NotificationPreferences) => void;
  loading?: boolean;
}

export default function NotificationSettingsCard({
  preferences,
  onPreferencesChange,
  loading = false,
}: NotificationSettingsCardProps) {
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const handleToggle = (field: keyof NotificationPreferences, value: boolean) => {
    onPreferencesChange({
      ...preferences,
      [field]: value,
    });
  };

  const parseTime = (timeString: string): Date => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  };

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      onPreferencesChange({
        ...preferences,
        quietHoursStart: formatTime(selectedDate),
      });
    }
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      onPreferencesChange({
        ...preferences,
        quietHoursEnd: formatTime(selectedDate),
      });
    }
  };

  const formatDisplayTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      await sendTestNotification();
      Alert.alert(
        'Test Sent',
        'You should receive a test notification in a moment!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'Failed to send test notification. Please check your notification permissions.',
        [{ text: 'OK' }]
      );
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Main Toggle */}
      <View style={styles.section}>
        <View style={styles.row}>
          <View style={styles.labelContainer}>
            <MaterialCommunityIcons
              name="bell"
              size={20}
              color={preferences.enabled ? colors.primary : colors.text.disabled}
            />
            <View style={styles.labelTextContainer}>
              <Text variant="titleMedium" style={styles.label}>
                Enable Meal Reminders
              </Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Get notified about upcoming meals
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.enabled}
            onValueChange={(value) => handleToggle('enabled', value)}
            disabled={loading}
            color={colors.primary}
          />
        </View>
      </View>

      {preferences.enabled && (
        <>
          {/* Timing Section */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Remind me:
            </Text>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleToggle('mealReminder24h', !preferences.mealReminder24h)}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name={preferences.mealReminder24h ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={preferences.mealReminder24h ? colors.primary : colors.text.secondary}
                />
                <Text variant="bodyMedium" style={styles.checkboxLabel}>
                  24 hours before meal
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleToggle('mealReminder3h', !preferences.mealReminder3h)}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name={preferences.mealReminder3h ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={preferences.mealReminder3h ? colors.primary : colors.text.secondary}
                />
                <Text variant="bodyMedium" style={styles.checkboxLabel}>
                  3 hours before meal
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleToggle('mealReminder1h', !preferences.mealReminder1h)}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name={preferences.mealReminder1h ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={preferences.mealReminder1h ? colors.primary : colors.text.secondary}
                />
                <Text variant="bodyMedium" style={styles.checkboxLabel}>
                  1 hour before meal
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Item Notifications Section */}
          <View style={styles.section}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Notify me about:
            </Text>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleToggle('notifyReservedItems', !preferences.notifyReservedItems)}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name={preferences.notifyReservedItems ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={preferences.notifyReservedItems ? colors.primary : colors.text.secondary}
                />
                <View style={styles.checkboxTextContainer}>
                  <Text variant="bodyMedium" style={styles.checkboxLabel}>
                    Items I reserved to bring
                  </Text>
                  <Text variant="bodySmall" style={styles.checkboxSubtitle}>
                    Reminder of what you're bringing
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleToggle('notifyUnassignedItems', !preferences.notifyUnassignedItems)}
                disabled={loading}
              >
                <MaterialCommunityIcons
                  name={preferences.notifyUnassignedItems ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={preferences.notifyUnassignedItems ? colors.primary : colors.text.secondary}
                />
                <View style={styles.checkboxTextContainer}>
                  <Text variant="bodyMedium" style={styles.checkboxLabel}>
                    Unassigned items (if I haven't reserved)
                  </Text>
                  <Text variant="bodySmall" style={styles.checkboxSubtitle}>
                    Get notified if items need bringing
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quiet Hours Section */}
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.labelContainer}>
                <MaterialCommunityIcons
                  name="moon-waning-crescent"
                  size={20}
                  color={preferences.quietHoursEnabled ? colors.primary : colors.text.disabled}
                />
                <Text variant="titleSmall" style={styles.label}>
                  Quiet Hours
                </Text>
              </View>
              <Switch
                value={preferences.quietHoursEnabled}
                onValueChange={(value) => handleToggle('quietHoursEnabled', value)}
                disabled={loading}
                color={colors.primary}
              />
            </View>

            {preferences.quietHoursEnabled && (
              <View style={styles.timePickerRow}>
                <View style={styles.timePickerContainer}>
                  <Text variant="bodySmall" style={styles.timeLabel}>
                    From
                  </Text>
                  <TouchableOpacity
                    style={styles.timePicker}
                    onPress={() => setShowStartTimePicker(true)}
                    disabled={loading}
                  >
                    <Text variant="bodyLarge" style={styles.timeText}>
                      {formatDisplayTime(preferences.quietHoursStart)}
                    </Text>
                  </TouchableOpacity>
                </View>

                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color={colors.text.secondary}
                  style={styles.arrow}
                />

                <View style={styles.timePickerContainer}>
                  <Text variant="bodySmall" style={styles.timeLabel}>
                    To
                  </Text>
                  <TouchableOpacity
                    style={styles.timePicker}
                    onPress={() => setShowEndTimePicker(true)}
                    disabled={loading}
                  >
                    <Text variant="bodyLarge" style={styles.timeText}>
                      {formatDisplayTime(preferences.quietHoursEnd)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {preferences.quietHoursEnabled && (
              <Text variant="bodySmall" style={styles.quietHoursHint}>
                Notifications scheduled during quiet hours will be delayed
              </Text>
            )}
          </View>

          {/* Test Notification Button */}
          <View style={styles.section}>
            <Button
              mode="outlined"
              onPress={handleSendTest}
              loading={sendingTest}
              disabled={sendingTest || loading}
              icon="bell-ring"
              style={styles.testButton}
            >
              Send Test Notification
            </Button>
          </View>
        </>
      )}

      {/* Time Pickers */}
      {showStartTimePicker && (
        <DateTimePicker
          value={parseTime(preferences.quietHoursStart)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartTimeChange}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={parseTime(preferences.quietHoursEnd)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    ...elevation.level1,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  labelTextContainer: {
    flex: 1,
  },
  label: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  subtitle: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  checkboxRow: {
    marginLeft: spacing.md,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  checkboxLabel: {
    color: colors.text.primary,
    flex: 1,
  },
  checkboxTextContainer: {
    flex: 1,
  },
  checkboxSubtitle: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  timePickerContainer: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeLabel: {
    color: colors.text.secondary,
  },
  timePicker: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 100,
    alignItems: 'center',
  },
  timeText: {
    fontWeight: '600',
    color: colors.primary,
  },
  arrow: {
    marginHorizontal: spacing.sm,
  },
  quietHoursHint: {
    color: colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  testButton: {
    marginTop: spacing.sm,
  },
});
