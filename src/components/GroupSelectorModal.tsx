import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Modal, Portal, Text, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, elevation } from '../theme';
import { GroupMembership } from '../types';

interface GroupSelectorModalProps {
  visible: boolean;
  groups: GroupMembership[];
  currentGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
  onDismiss: () => void;
}

/**
 * Modal for selecting which group to work with
 * Shown to users with multiple groups after app has been backgrounded for 3+ hours
 */
export default function GroupSelectorModal({
  visible,
  groups,
  currentGroupId,
  onSelectGroup,
  onDismiss,
}: GroupSelectorModalProps) {
  const handleGroupPress = (groupId: string) => {
    onSelectGroup(groupId);
    onDismiss();
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Select Group
          </Text>
          <IconButton
            icon="close"
            size={24}
            onPress={onDismiss}
            style={styles.closeButton}
          />
        </View>

        <Text variant="bodyMedium" style={styles.subtitle}>
          Choose which group you'd like to work with
        </Text>

        <ScrollView style={styles.groupList} showsVerticalScrollIndicator={false}>
          {groups.map((group) => {
            const isCurrentGroup = group.groupId === currentGroupId;
            return (
              <TouchableOpacity
                key={group.groupId}
                style={[
                  styles.groupItem,
                  isCurrentGroup && styles.currentGroupItem,
                ]}
                onPress={() => handleGroupPress(group.groupId)}
              >
                <View style={styles.groupInfo}>
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.groupName,
                      isCurrentGroup && styles.currentGroupName,
                    ]}
                  >
                    {group.groupName}
                  </Text>
                  <Text variant="bodySmall" style={styles.groupCode}>
                    Code: {group.code}
                  </Text>
                </View>

                {isCurrentGroup && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={24}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.xl,
    maxHeight: '80%',
    ...elevation.level3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeButton: {
    margin: 0,
  },
  subtitle: {
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  groupList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  currentGroupItem: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryContainer,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  currentGroupName: {
    color: colors.primary,
  },
  groupCode: {
    color: colors.text.secondary,
    fontSize: 12,
  },
});
