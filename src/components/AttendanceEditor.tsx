import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, elevation } from '../theme';
import { PartySize } from '../types';

interface AttendanceEditorProps {
  defaultPartySize: PartySize;
  currentAttendance?: { adults: number; children: number };
  onSave: (adults: number, children: number) => void;
  onCancel?: () => void;
  loading?: boolean;
}

/**
 * Attendance editor component for adjusting per-menu attendance
 */
export default function AttendanceEditor({
  defaultPartySize,
  currentAttendance,
  onSave,
  onCancel,
  loading = false,
}: AttendanceEditorProps) {
  const [adults, setAdults] = useState(
    currentAttendance?.adults ?? defaultPartySize.adults
  );
  const [children, setChildren] = useState(
    currentAttendance?.children ?? defaultPartySize.children
  );

  useEffect(() => {
    if (currentAttendance) {
      setAdults(currentAttendance.adults);
      setChildren(currentAttendance.children);
    }
  }, [currentAttendance]);

  const handleIncrement = (current: number, onChange: (value: number) => void) => {
    if (!loading && current < 20) {
      onChange(current + 1);
    }
  };

  const handleDecrement = (current: number, onChange: (value: number) => void) => {
    if (!loading && current > 0) {
      onChange(current - 1);
    }
  };

  const handleSave = () => {
    onSave(adults, children);
  };

  const isNotAttending = adults === 0 && children === 0;
  const hasChanges =
    adults !== (currentAttendance?.adults ?? defaultPartySize.adults) ||
    children !== (currentAttendance?.children ?? defaultPartySize.children);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.title}>
          My Attendance
        </Text>
        <Text variant="bodySmall" style={styles.subtitle}>
          Default: {defaultPartySize.adults} {defaultPartySize.adults === 1 ? 'adult' : 'adults'}, {defaultPartySize.children} {defaultPartySize.children === 1 ? 'child' : 'children'}
        </Text>
      </View>

      {/* Adults */}
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <MaterialCommunityIcons
            name="account"
            size={20}
            color={colors.text.secondary}
          />
          <Text variant="bodyMedium" style={styles.label}>
            Adults
          </Text>
        </View>
        <View style={styles.controls}>
          <IconButton
            icon="minus"
            size={18}
            disabled={loading || adults <= 0}
            onPress={() => handleDecrement(adults, setAdults)}
            style={styles.button}
          />
          <View style={styles.valueContainer}>
            <Text variant="titleMedium" style={styles.value}>
              {adults}
            </Text>
          </View>
          <IconButton
            icon="plus"
            size={18}
            disabled={loading || adults >= 20}
            onPress={() => handleIncrement(adults, setAdults)}
            style={styles.button}
          />
        </View>
      </View>

      {/* Children */}
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <MaterialCommunityIcons
            name="account-child"
            size={20}
            color={colors.text.secondary}
          />
          <Text variant="bodyMedium" style={styles.label}>
            Children
          </Text>
        </View>
        <View style={styles.controls}>
          <IconButton
            icon="minus"
            size={18}
            disabled={loading || children <= 0}
            onPress={() => handleDecrement(children, setChildren)}
            style={styles.button}
          />
          <View style={styles.valueContainer}>
            <Text variant="titleMedium" style={styles.value}>
              {children}
            </Text>
          </View>
          <IconButton
            icon="plus"
            size={18}
            disabled={loading || children >= 20}
            onPress={() => handleIncrement(children, setChildren)}
            style={styles.button}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text variant="bodyMedium" style={styles.total}>
          Total: {adults + children} {adults + children === 1 ? 'person' : 'people'}
        </Text>
        {isNotAttending && (
          <Text variant="bodySmall" style={styles.notAttendingText}>
            You will be marked as not attending
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {onCancel && (
          <Button
            mode="outlined"
            onPress={onCancel}
            disabled={loading}
            style={styles.actionButton}
          >
            Cancel
          </Button>
        )}
        <Button
          mode="contained"
          onPress={handleSave}
          disabled={loading || !hasChanges}
          loading={loading}
          style={styles.actionButton}
        >
          {isNotAttending ? 'Mark Not Attending' : 'Save Attendance'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...elevation.level1,
  },
  header: {
    marginBottom: spacing.sm,
  },
  title: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  subtitle: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.text.primary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  button: {
    margin: 0,
  },
  valueContainer: {
    minWidth: 36,
    alignItems: 'center',
  },
  value: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  total: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  notAttendingText: {
    color: colors.warning,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
