import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, RefreshControl, Platform, TouchableOpacity } from 'react-native';
import { Text, FAB, Chip, IconButton, Menu, Divider, Button, Dialog, Portal, TextInput } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Loading, EmptyState, MenuItemCard, AttendanceEditor, Avatar, MenuImage, ImageLightbox } from '../../components';
import { colors, spacing, borderRadius, elevation } from '../../theme';
import { useAppStore } from '../../store';
import {
  getMenuById,
  getMenuItems,
  updateMenuStatus,
  toggleItemReservation,
  deleteMenu,
  deleteMenuItem,
  updateMyAttendance,
  updateMenu,
  getMenuByDate,
} from '../../services/menuService';
import { getGroupById } from '../../services/groupService';
import { Menu as MenuType, MenuItem, RootStackParamList, MenuAttendee, GroupMember } from '../../types';
import { formatDate, parseDateKey, formatDateKey } from '../../utils/dateUtils';

type MenuDetailsRouteProp = RouteProp<RootStackParamList, 'MenuDetails'>;
type MenuDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'MenuDetails'>;

export default function MenuDetailsScreen() {
  const route = useRoute<MenuDetailsRouteProp>();
  const navigation = useNavigation<MenuDetailsNavigationProp>();
  const { currentGroupId, userProfile } = useAppStore();

  const [menu, setMenu] = useState<MenuType | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'mine'>('all');

  // Edit menu dialog state
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editedMenuName, setEditedMenuName] = useState('');
  const [editedDate, setEditedDate] = useState(new Date());
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  // Attendance editor state
  const [showAttendanceEditor, setShowAttendanceEditor] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Image lightbox state
  const [showImageLightbox, setShowImageLightbox] = useState(false);

  const { menuId, dateString} = route.params;
  const date = parseDateKey(dateString);

  const loadMenuData = useCallback(async (isRefreshing = false) => {
    if (!currentGroupId) return;

    if (!isRefreshing) {
      setLoading(true);
    }

    try {
      const [menuData, itemsData, groupData] = await Promise.all([
        getMenuById(currentGroupId, menuId),
        getMenuItems(currentGroupId, menuId),
        getGroupById(currentGroupId),
      ]);

      setMenu(menuData);
      setItems(itemsData);
      setGroupMembers(groupData?.members || []);
    } catch (error) {
      console.error('Error loading menu:', error);
      Alert.alert('Error', 'Failed to load menu details');
    } finally {
      if (!isRefreshing) {
        setLoading(false);
      }
    }
  }, [currentGroupId, menuId]);

  useFocusEffect(
    useCallback(() => {
      loadMenuData();
    }, [loadMenuData])
  );

  // Poll for image updates while generating
  useEffect(() => {
    if (!menu?.imageGenerating || !currentGroupId) return;

    const pollInterval = setInterval(async () => {
      try {
        const updatedMenu = await getMenuById(currentGroupId, menuId);
        if (updatedMenu && !updatedMenu.imageGenerating) {
          // Image generation complete, update state
          setMenu(updatedMenu);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Error polling for image updates:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [menu?.imageGenerating, currentGroupId, menuId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMenuData(true);
    setRefreshing(false);
  };

  const handleToggleReservation = async (item: MenuItem) => {
    if (!currentGroupId || !userProfile) return;

    const isMyItem = item.reservedBy === userProfile.name;
    const newReservedBy = isMyItem ? null : userProfile.name;

    try {
      await toggleItemReservation(currentGroupId, menuId, item.id, newReservedBy);

      // Update local state
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, reservedBy: newReservedBy } : i
        )
      );
    } catch (error) {
      console.error('Error toggling reservation:', error);
      Alert.alert('Error', 'Failed to update reservation');
    }
  };

  const handleDeleteItem = (item: MenuItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentGroupId) return;

            try {
              await deleteMenuItem(currentGroupId, menuId, item.id);

              // Update local state
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const handleToggleMenuStatus = async () => {
    if (!currentGroupId || !menu) return;

    const newStatus = menu.status === 'proposed' ? 'active' : 'proposed';

    try {
      await updateMenuStatus(currentGroupId, menuId, newStatus);
      // Reload menu data to get updated attendees (auto-populated on activation)
      await loadMenuData(true);
      setMenuVisible(false);
      Alert.alert(
        'Success',
        `Menu is now ${newStatus === 'active' ? 'active' : 'proposed'}`
      );
    } catch (error) {
      console.error('Error updating menu status:', error);
      Alert.alert('Error', 'Failed to update menu status');
    }
  };

  const handleDeleteMenu = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Menu',
      'Are you sure you want to delete this menu and all its items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!currentGroupId) return;

            try {
              await deleteMenu(currentGroupId, menuId);
              Alert.alert('Deleted', 'Menu has been deleted');
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting menu:', error);
              Alert.alert('Error', 'Failed to delete menu');
            }
          },
        },
      ]
    );
  };

  const handleEditMenu = () => {
    if (!menu) return;
    setMenuVisible(false);
    setEditedMenuName(menu.name);
    setEditedDate(menu.date);
    setEditDialogVisible(true);
  };

  const handleEditDateChange = (event: any, date?: Date) => {
    setShowEditDatePicker(Platform.OS === 'ios');
    if (date) {
      setEditedDate(date);
    }
  };

  const handleSaveEdit = async () => {
    if (!currentGroupId || !menu) return;

    if (!editedMenuName.trim()) {
      Alert.alert('Error', 'Please enter a menu name');
      return;
    }

    try {
      // Check if date changed and if there's already a menu on the new date
      const dateChanged = formatDateKey(editedDate) !== formatDateKey(menu.date);

      if (dateChanged) {
        const existingMenu = await getMenuByDate(currentGroupId, editedDate);
        if (existingMenu && existingMenu.id !== menuId) {
          Alert.alert(
            'Date Conflict',
            `A menu already exists for ${formatDate(editedDate, 'MMMM d, yyyy')}. Please choose a different date.`
          );
          return;
        }
      }

      await updateMenu(currentGroupId, menuId, {
        name: editedMenuName.trim(),
        date: editedDate,
      });

      // Update local state
      setMenu({
        ...menu,
        name: editedMenuName.trim(),
        date: editedDate,
      });

      setEditDialogVisible(false);
      Alert.alert('Success', 'Menu updated successfully');
    } catch (error) {
      console.error('Error updating menu:', error);
      Alert.alert('Error', 'Failed to update menu');
    }
  };

  const handleAddItem = () => {
    navigation.navigate('AddEditItem', { menuId });
  };

  const handleSaveAttendance = async (adults: number, children: number) => {
    if (!currentGroupId || !userProfile || !menu) return;

    setSavingAttendance(true);

    try {
      await updateMyAttendance(
        currentGroupId,
        menuId,
        userProfile.name,
        adults,
        children,
        userProfile.profileImageUri
      );

      // Update local state
      const updatedAttendees = menu.attendees.filter(
        (attendee) => attendee.name !== userProfile.name
      );

      if (adults > 0 || children > 0) {
        updatedAttendees.push({
          name: userProfile.name,
          adults,
          children,
          profileImageUri: userProfile.profileImageUri,
        });
      }

      setMenu({
        ...menu,
        attendees: updatedAttendees,
      });

      setShowAttendanceEditor(false);
    } catch (error) {
      console.error('Error updating attendance:', error);
      Alert.alert('Error', 'Failed to update attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  const getFilteredItems = () => {
    switch (filter) {
      case 'available':
        return items.filter((item) => !item.reservedBy);
      case 'mine':
        return items.filter((item) => item.reservedBy === userProfile?.name);
      default:
        return items;
    }
  };

  const getProfileImageByName = (name: string | null): string | undefined => {
    if (!name) return undefined;
    return groupMembers.find(member => member.name === name)?.profileImageUri;
  };

  const availableCount = items.filter((i) => !i.reservedBy).length;
  const myCount = items.filter((i) => i.reservedBy === userProfile?.name).length;

  if (loading) {
    return <Loading message="Loading menu..." />;
  }

  if (!menu) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          icon="food-off"
          title="Menu Not Found"
          message="This menu no longer exists"
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <MenuImage
              imageUrl={menu.imageUrl}
              isGenerating={menu.imageGenerating}
              title={menu.name}
              size="small"
              style={styles.headerImage}
              onPress={() => setShowImageLightbox(true)}
            />
            <View style={styles.headerContent}>
              <Text variant="headlineSmall" style={styles.headerTitle}>
                {menu.name}
              </Text>
              <View style={styles.headerSubtitle}>
                <Text variant="bodyMedium" style={styles.dateText}>
                  {formatDate(menu.date, 'EEEE, MMM d, yyyy')}
                </Text>
                <Text variant="bodySmall" style={styles.proposedBy}>
                  Proposed by {menu.proposedBy}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerActions}>
            {menu.status === 'proposed' ? (
              <Button
                mode="contained"
                onPress={handleToggleMenuStatus}
                icon="check-circle"
                style={styles.activateButton}
                buttonColor={colors.menuActive}
                compact
              >
                Activate
              </Button>
            ) : (
              <View style={styles.activeStatusRow}>
                <Chip
                  icon="check-circle"
                  style={styles.activeChip}
                  textStyle={styles.activeChipText}
                  compact
                >
                  Active
                </Chip>
                <Button
                  mode="text"
                  onPress={handleToggleMenuStatus}
                  compact
                  textColor={colors.text.secondary}
                  style={styles.deactivateButton}
                >
                  Deactivate
                </Button>
              </View>
            )}
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  onPress={() => setMenuVisible(true)}
                />
              }
            >
              <Menu.Item
                onPress={handleEditMenu}
                title="Edit Menu"
                leadingIcon="pencil"
              />
              <Divider />
              <Menu.Item
                onPress={handleDeleteMenu}
                title="Delete Menu"
                leadingIcon="delete"
              />
            </Menu>
          </View>
        </View>

        {/* Attendance Section - Only show for active menus */}
        {menu.status === 'active' && (
          <View style={styles.attendanceSection}>
            <View style={styles.attendanceHeader}>
              <View style={styles.attendanceInfo}>
                <MaterialCommunityIcons
                  name="account-group"
                  size={20}
                  color={colors.primary}
                />
                <Text variant="titleSmall" style={styles.attendanceTitle}>
                  Attendance: {menu.attendees.reduce((sum, a) => sum + a.adults, 0)} adults, {menu.attendees.reduce((sum, a) => sum + a.children, 0)} children ({menu.attendees.reduce((sum, a) => sum + a.adults + a.children, 0)} total)
                </Text>
              </View>
              <Button
                mode={
                  userProfile && menu.attendees.some(a => a.name === userProfile.name)
                    ? 'contained'
                    : 'outlined'
                }
                onPress={() => setShowAttendanceEditor(!showAttendanceEditor)}
                compact
                style={styles.attendanceButton}
                icon={
                  userProfile && menu.attendees.some(a => a.name === userProfile.name)
                    ? 'check'
                    : 'close'
                }
              >
                {userProfile && menu.attendees.some(a => a.name === userProfile.name)
                  ? 'Attending'
                  : 'Not Attending'}
              </Button>
            </View>

            {showAttendanceEditor && userProfile && (
              <View style={styles.attendanceEditorContainer}>
                <AttendanceEditor
                  defaultPartySize={userProfile.partySize}
                  currentAttendance={menu.attendees.find(a => a.name === userProfile.name)}
                  onSave={handleSaveAttendance}
                  onCancel={() => setShowAttendanceEditor(false)}
                  loading={savingAttendance}
                />
              </View>
            )}

            {menu.attendees.length > 0 && (
              <View style={styles.attendeesList}>
                {menu.attendees.map((attendee, index) => (
                  <View key={index} style={styles.attendeeChipContainer}>
                    <Avatar
                      imageUri={attendee.profileImageUri}
                      name={attendee.name}
                      size={32}
                      style={styles.attendeeAvatar}
                    />
                    <Chip
                      style={[
                        styles.attendeeChip,
                        attendee.name === userProfile?.name && styles.myAttendeeChip,
                      ]}
                      textStyle={styles.attendeeChipText}
                      compact
                    >
                      {attendee.name === userProfile?.name ? 'You' : attendee.name} ({[
                        attendee.adults > 0 ? `${attendee.adults}A` : null,
                        attendee.children > 0 ? `${attendee.children}C` : null,
                      ].filter(Boolean).join(', ')})
                    </Chip>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Filters */}
        <View style={styles.filters}>
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={styles.filterChip}
          >
            All ({items.length})
          </Chip>
          <Chip
            selected={filter === 'available'}
            onPress={() => setFilter('available')}
            style={styles.filterChip}
          >
            Available ({availableCount})
          </Chip>
          <Chip
            selected={filter === 'mine'}
            onPress={() => setFilter('mine')}
            style={styles.filterChip}
          >
            Mine ({myCount})
          </Chip>
        </View>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon="food-off"
            title={
              filter === 'all'
                ? 'No Items Yet'
                : filter === 'available'
                ? 'No Available Items'
                : 'No Items Reserved'
            }
            message={
              filter === 'all'
                ? 'Add items to the menu to get started'
                : filter === 'available'
                ? 'All items have been reserved'
                : "You haven't reserved any items yet"
            }
          />
        ) : (
          <View style={styles.list}>
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                reservedByProfileImage={getProfileImageByName(item.reservedBy)}
                onReserve={() => handleToggleReservation(item)}
                onDelete={() => handleDeleteItem(item)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddItem}
        label="Add Item"
        color={colors.text.onPrimary}
      />

      {/* Edit Menu Dialog */}
      <Portal>
        <Dialog
          visible={editDialogVisible}
          onDismiss={() => setEditDialogVisible(false)}
        >
          <Dialog.Title>Edit Menu</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Menu Name *"
              value={editedMenuName}
              onChangeText={setEditedMenuName}
              style={{ marginBottom: spacing.md }}
            />

            <TouchableOpacity
              style={styles.editDateCard}
              onPress={() => setShowEditDatePicker(true)}
            >
              <View style={styles.editDateContent}>
                <View>
                  <Text variant="bodySmall" style={styles.editDateLabel}>
                    Meal Date
                  </Text>
                  <Text variant="titleMedium" style={styles.editDateText}>
                    {formatDate(editedDate, 'EEEE, MMMM d, yyyy')}
                  </Text>
                </View>
                <IconButton
                  icon="calendar-edit"
                  size={20}
                  iconColor={colors.primary}
                />
              </View>
            </TouchableOpacity>

            {showEditDatePicker && (
              <DateTimePicker
                value={editedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEditDateChange}
              />
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleSaveEdit}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Image Lightbox */}
      <ImageLightbox
        visible={showImageLightbox}
        imageUrl={menu.imageUrl}
        onClose={() => setShowImageLightbox(false)}
        title={menu.name}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerImage: {
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    gap: spacing.xs,
  },
  dateText: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  proposedBy: {
    color: colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  activateButton: {
    marginRight: spacing.xs,
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginRight: spacing.xs,
  },
  activeChip: {
    backgroundColor: colors.menuActiveContainer,
  },
  activeChipText: {
    color: colors.menuActive,
    fontWeight: '500',
  },
  deactivateButton: {
    minWidth: 0,
  },
  attendanceSection: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  attendanceTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  attendanceButton: {
    marginLeft: spacing.sm,
  },
  attendanceEditorContainer: {
    marginTop: spacing.md,
  },
  attendeesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  attendeeChipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  attendeeAvatar: {
    marginRight: spacing.xs,
  },
  attendeeChip: {
    backgroundColor: colors.background,
  },
  myAttendeeChip: {
    backgroundColor: colors.primaryContainer,
  },
  attendeeChipText: {
    fontSize: 12,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  filterChip: {},
  list: {
    paddingBottom: spacing.xxl,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary,
  },
  editDateCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editDateContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editDateLabel: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  editDateText: {
    fontWeight: '600',
    color: colors.text.primary,
  },
});
