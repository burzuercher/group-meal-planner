import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MenuItem } from '../types';
import { colors, spacing, borderRadius, elevation } from '../theme';
import { useAppStore } from '../store';
import Avatar from './Avatar';

interface MenuItemCardProps {
  item: MenuItem;
  reservedByProfileImage?: string; // Profile image URI of the person who reserved this item
  onPress?: () => void;
  onReserve?: () => void;
  onDelete?: () => void;
}

export default function MenuItemCard({
  item,
  reservedByProfileImage,
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
                style={styles.categoryChip}
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
            <View style={styles.statusContainer}>
              {!isAvailable && item.reservedBy && (
                <Avatar
                  imageUri={reservedByProfileImage}
                  name={item.reservedBy}
                  size={24}
                  style={styles.statusAvatar}
                />
              )}
              <Text
                variant="bodySmall"
                style={[styles.status, { color: getStatusColor() }]}
              >
                {getStatusText()}
              </Text>
            </View>
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
    backgroundColor: colors.surface,
    ...elevation.level1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryContainer,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.round,
  },
  deleteButton: {
    margin: -8,
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
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statusAvatar: {
    marginRight: spacing.xs,
  },
  status: {
    fontWeight: '500',
    fontSize: 13,
    flex: 1,
  },
  reserveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 32,
    justifyContent: 'center',
  },
  reserveButtonText: {
    color: colors.text.onPrimary,
    fontWeight: '600',
    fontSize: 13,
  },
});
