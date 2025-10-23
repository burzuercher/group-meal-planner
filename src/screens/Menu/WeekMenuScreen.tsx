import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, Chip } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, EmptyState, Loading } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store';
import { getMenusInRange, getMenuItems } from '../../services/menuService';
import { Menu, MenuItem, RootStackParamList } from '../../types';
import { getCurrentWeekRange, formatDate, formatDateKey } from '../../utils/dateUtils';

type WeekMenuNavigationProp = StackNavigationProp<RootStackParamList>;

interface MenuWithItems extends Menu {
  items: MenuItem[];
  availableCount: number;
  myCount: number;
}

export default function WeekMenuScreen() {
  const navigation = useNavigation<WeekMenuNavigationProp>();
  const { currentGroupId, userProfile } = useAppStore();

  const [menus, setMenus] = useState<MenuWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadWeekMenus();
    }, [currentGroupId])
  );

  const loadWeekMenus = async (isRefresh = false) => {
    if (!currentGroupId) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const { start, end } = getCurrentWeekRange();
      const weekMenus = await getMenusInRange(currentGroupId, start, end);

      // Load items for each menu
      const menusWithItems = await Promise.all(
        weekMenus.map(async (menu) => {
          const items = await getMenuItems(currentGroupId, menu.id);
          const availableCount = items.filter((i) => !i.reservedBy).length;
          const myCount = items.filter(
            (i) => i.reservedBy === userProfile?.name
          ).length;

          return {
            ...menu,
            items,
            availableCount,
            myCount,
          };
        })
      );

      setMenus(menusWithItems);
    } catch (error) {
      console.error('Error loading week menus:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadWeekMenus(true);
  };

  const handleProposeMenu = () => {
    navigation.navigate('ProposeMenu', { dateString: formatDateKey(new Date()) });
  };

  const handleMenuPress = (menu: MenuWithItems) => {
    navigation.navigate('MenuDetails', {
      menuId: menu.id,
      dateString: formatDateKey(menu.date),
    });
  };

  if (!currentGroupId) {
    return (
      <Screen>
        <EmptyState
          icon="account-group-outline"
          title="No Group Selected"
          message="Please select or create a group from the Groups tab to start planning meals"
        />
      </Screen>
    );
  }

  if (loading) {
    return <Loading message="Loading this week's menus..." />;
  }

  const { start, end } = getCurrentWeekRange();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.headerTitle}>
            This Week
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            {formatDate(start, 'MMM d')} - {formatDate(end, 'MMM d, yyyy')}
          </Text>
        </View>

        {menus.length === 0 ? (
          <EmptyState
            icon="calendar-blank"
            title="No Meals This Week"
            message="No meals have been planned for this week yet"
            actionLabel="Propose Menu"
            onAction={handleProposeMenu}
          />
        ) : (
          <FlatList
            data={menus}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <WeekMenuCard
                menu={item}
                onPress={() => handleMenuPress(item)}
              />
            )}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          />
        )}
      </View>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleProposeMenu}
        label="Propose Menu"
      />
    </Screen>
  );
}

interface WeekMenuCardProps {
  menu: MenuWithItems;
  onPress: () => void;
}

function WeekMenuCard({ menu, onPress }: WeekMenuCardProps) {
  return (
    <Card style={styles.card} onPress={onPress}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {formatDate(menu.date, 'EEEE, MMM d')}
            </Text>
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
              compact
            >
              {menu.status === 'active' ? 'Active' : 'Proposed'}
            </Chip>
          </View>
        </View>

        <Text variant="bodySmall" style={styles.proposedBy}>
          Proposed by {menu.proposedBy}
        </Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text variant="labelLarge" style={styles.statValue}>
              {menu.items.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Total Items
            </Text>
          </View>
          <View style={styles.stat}>
            <Text
              variant="labelLarge"
              style={[styles.statValue, { color: colors.available }]}
            >
              {menu.availableCount}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Available
            </Text>
          </View>
          <View style={styles.stat}>
            <Text
              variant="labelLarge"
              style={[styles.statValue, { color: colors.myReserved }]}
            >
              {menu.myCount}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              My Items
            </Text>
          </View>
        </View>

        {menu.items.length > 0 && (
          <View style={styles.itemPreview}>
            {menu.items.slice(0, 3).map((item, index) => (
              <View key={item.id} style={styles.itemPreviewRow}>
                <View
                  style={[
                    styles.itemDot,
                    {
                      backgroundColor: item.reservedBy
                        ? colors.reserved
                        : colors.available,
                    },
                  ]}
                />
                <Text variant="bodySmall" style={styles.itemPreviewText}>
                  {item.name}
                </Text>
              </View>
            ))}
            {menu.items.length > 3 && (
              <Text variant="bodySmall" style={styles.moreItems}>
                +{menu.items.length - 3} more item
                {menu.items.length - 3 !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerSubtitle: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cardHeader: {
    marginBottom: spacing.sm,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontWeight: '600',
    flex: 1,
  },
  statusChip: {
    marginLeft: spacing.sm,
  },
  proposedBy: {
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: '700',
    fontSize: 24,
  },
  statLabel: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  itemPreview: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  itemPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.sm,
  },
  itemPreviewText: {
    color: colors.text.secondary,
  },
  moreItems: {
    color: colors.text.disabled,
    marginLeft: spacing.lg,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary,
  },
});
