import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MenuItem } from '../types';
import { colors, spacing, borderRadius } from '../theme';
import { useAppStore } from '../store';

interface MenuItemCardProps {
  item: MenuItem;
  onPress?: () => void;
  onReserve?: () => void;
  onDelete?: () => void;
}

export default function MenuItemCard({
  item,
  onPress,
  onReserve,
  onDelete,
}: MenuItemCardProps) {
  const userProfile = useAppStore((state) => state.userProfile);
  const isAvailable = !item.reservedBy;
  const isMyItem = item.reservedBy === userProfile?.name;

  const getStatusColor = () => {
    if (isAvailable) return colors.available;
    if (isMyItem) return colors.myReserved;
    return colors.reserved;
  };

  const getStatusText = () => {
    if (isAvailable) return 'Available';
    if (isMyItem) return 'Reserved by you';
    return `Reserved by ${item.reservedBy}`;
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text variant="titleMedium" style={styles.title}>
                {item.name}
              </Text>
              <Chip
                style={[styles.categoryChip, { backgroundColor: colors.primaryContainer }]}
                textStyle={styles.categoryText}
              >
                {item.category}
              </Chip>
            </View>
            <View style={styles.headerActions}>
              <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
              {onDelete && (
                <IconButton
                  icon="delete"
                  size={20}
                  iconColor={colors.error}
                  onPress={onDelete}
                  style={styles.deleteButton}
                />
              )}
            </View>
          </View>

          {item.quantity && (
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="counter"
                size={16}
                color={colors.text.secondary}
              />
              <Text variant="bodyMedium" style={styles.detail}>
                {item.quantity}
              </Text>
            </View>
          )}

          {item.dietaryInfo && (
            <View style={styles.row}>
              <MaterialCommunityIcons
                name="food-apple"
                size={16}
                color={colors.text.secondary}
              />
              <Text variant="bodyMedium" style={styles.detail}>
                {item.dietaryInfo}
              </Text>
            </View>
          )}

          {item.notes && (
            <Text variant="bodySmall" style={styles.notes}>
              {item.notes}
            </Text>
          )}

          <View style={styles.footer}>
            <Text
              variant="bodySmall"
              style={[styles.status, { color: getStatusColor() }]}
            >
              {getStatusText()}
            </Text>
            {onReserve && (
              <TouchableOpacity
                onPress={onReserve}
                style={[
                  styles.reserveButton,
                  { backgroundColor: getStatusColor() },
                ]}
              >
                <Text style={styles.reserveButtonText}>
                  {isMyItem ? 'Unreserve' : isAvailable ? 'Reserve' : 'Reserved'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  categoryChip: {
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.round,
  },
  deleteButton: {
    margin: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  detail: {
    marginLeft: spacing.xs,
    color: colors.text.secondary,
  },
  notes: {
    marginTop: spacing.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  status: {
    fontWeight: '600',
  },
  reserveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  reserveButtonText: {
    color: colors.text.onPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
});
