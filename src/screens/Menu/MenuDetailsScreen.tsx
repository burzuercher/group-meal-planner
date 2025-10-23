import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, FAB, Chip, IconButton, Menu, Divider } from 'react-native-paper';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, Loading, EmptyState, MenuItemCard } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store';
import {
  getMenuById,
  getMenuItems,
  updateMenuStatus,
  toggleItemReservation,
  deleteMenu,
} from '../../services/menuService';
import { Menu as MenuType, MenuItem, RootStackParamList } from '../../types';
import { formatDate, parseDateKey } from '../../utils/dateUtils';

type MenuDetailsRouteProp = RouteProp<RootStackParamList, 'MenuDetails'>;
type MenuDetailsNavigationProp = StackNavigationProp<RootStackParamList, 'MenuDetails'>;

export default function MenuDetailsScreen() {
  const route = useRoute<MenuDetailsRouteProp>();
  const navigation = useNavigation<MenuDetailsNavigationProp>();
  const { currentGroupId, userProfile } = useAppStore();

  const [menu, setMenu] = useState<MenuType | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'available' | 'mine'>('all');

  const { menuId, dateString } = route.params;
  const date = parseDateKey(dateString);

  useEffect(() => {
    loadMenuData();
  }, [menuId]);

  const loadMenuData = async () => {
    if (!currentGroupId) return;

    setLoading(true);
    try {
      const [menuData, itemsData] = await Promise.all([
        getMenuById(currentGroupId, menuId),
        getMenuItems(currentGroupId, menuId),
      ]);

      setMenu(menuData);
      setItems(itemsData);
    } catch (error) {
      console.error('Error loading menu:', error);
      Alert.alert('Error', 'Failed to load menu details');
    } finally {
      setLoading(false);
    }
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

  const handleToggleMenuStatus = async () => {
    if (!currentGroupId || !menu) return;

    const newStatus = menu.status === 'proposed' ? 'active' : 'proposed';

    try {
      await updateMenuStatus(currentGroupId, menuId, newStatus);
      setMenu({ ...menu, status: newStatus });
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

  const handleAddItem = () => {
    navigation.navigate('AddEditItem', { menuId });
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

  const availableCount = items.filter((i) => !i.reservedBy).length;
  const myCount = items.filter((i) => i.reservedBy === userProfile?.name).length;

  if (loading) {
    return <Loading message="Loading menu..." />;
  }

  if (!menu) {
    return (
      <Screen>
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
    <Screen>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text variant="titleLarge" style={styles.headerTitle}>
              {formatDate(date, 'EEEE, MMM d')}
            </Text>
            <Text variant="bodyMedium" style={styles.proposedBy}>
              Proposed by {menu.proposedBy}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Chip
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    menu.status === 'active'
                      ? colors.primaryContainer
                      : colors.warning,
                },
              ]}
            >
              {menu.status === 'active' ? 'Active' : 'Proposed'}
            </Chip>
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
                onPress={handleToggleMenuStatus}
                title={
                  menu.status === 'proposed'
                    ? 'Mark as Active'
                    : 'Mark as Proposed'
                }
                leadingIcon={
                  menu.status === 'proposed' ? 'check-circle' : 'circle-outline'
                }
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
            actionLabel={filter === 'all' ? 'Add Item' : undefined}
            onAction={filter === 'all' ? handleAddItem : undefined}
          />
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MenuItemCard
                item={item}
                onReserve={() => handleToggleReservation(item)}
              />
            )}
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddItem}
        label="Add Item"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  proposedBy: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginRight: spacing.xs,
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
});
