import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, elevation } from '../theme';

interface PartySizeInputProps {
  adults: number;
  children: number;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Party size input component with increment/decrement buttons
 */
export default function PartySizeInput({
  adults,
  children,
  onAdultsChange,
  onChildrenChange,
  disabled = false,
}: PartySizeInputProps) {
  const handleIncrement = (current: number, onChange: (value: number) => void) => {
    if (!disabled && current < 20) {
      onChange(current + 1);
    }
  };

  const handleDecrement = (current: number, onChange: (value: number) => void, min: number = 0) => {
    if (!disabled && current > min) {
      onChange(current - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Adults */}
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <MaterialCommunityIcons
            name="account"
            size={24}
            color={colors.text.secondary}
          />
          <Text variant="titleMedium" style={styles.label}>
            Adults
          </Text>
        </View>
        <View style={styles.controls}>
          <IconButton
            icon="minus"
            size={20}
            disabled={disabled || adults <= 1}
            onPress={() => handleDecrement(adults, onAdultsChange, 1)}
            style={styles.button}
          />
          <View style={styles.valueContainer}>
            <Text variant="titleLarge" style={styles.value}>
              {adults}
            </Text>
          </View>
          <IconButton
            icon="plus"
            size={20}
            disabled={disabled || adults >= 20}
            onPress={() => handleIncrement(adults, onAdultsChange)}
            style={styles.button}
          />
        </View>
      </View>

      {/* Children */}
      <View style={styles.row}>
        <View style={styles.labelContainer}>
          <MaterialCommunityIcons
            name="account-child"
            size={24}
            color={colors.text.secondary}
          />
          <Text variant="titleMedium" style={styles.label}>
            Children
          </Text>
        </View>
        <View style={styles.controls}>
          <IconButton
            icon="minus"
            size={20}
            disabled={disabled || children <= 0}
            onPress={() => handleDecrement(children, onChildrenChange, 0)}
            style={styles.button}
          />
          <View style={styles.valueContainer}>
            <Text variant="titleLarge" style={styles.value}>
              {children}
            </Text>
          </View>
          <IconButton
            icon="plus"
            size={20}
            disabled={disabled || children >= 20}
            onPress={() => handleIncrement(children, onChildrenChange)}
            style={styles.button}
          />
        </View>
      </View>

      <View style={styles.totalRow}>
        <Text variant="bodyMedium" style={styles.totalLabel}>
          Total party size:
        </Text>
        <Text variant="titleMedium" style={styles.totalValue}>
          {adults + children} {adults + children === 1 ? 'person' : 'people'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.text.primary,
    fontWeight: '500',
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
    minWidth: 40,
    alignItems: 'center',
  },
  value: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    color: colors.text.secondary,
  },
  totalValue: {
    fontWeight: '600',
    color: colors.primary,
  },
});
