import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, Card, FAB, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, EmptyState, Loading } from '../../components';
import { colors, spacing, borderRadius, elevation } from '../../theme';
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
      <Screen edges={['bottom']}>
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
          <Text variant="displaySmall" style={styles.headerTitle}>
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
  const isActive = menu.status === 'active';
  const statusColor = isActive ? colors.menuActive : colors.menuProposed;

  return (
    <Card
      style={[
        styles.card,
        {
          borderLeftWidth: 2,
          borderLeftColor: statusColor,
        }
      ]}
      onPress={onPress}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <View style={styles.titleSection}>
              <Text variant="titleLarge" style={styles.menuName}>
                {menu.name}
              </Text>
              <Text variant="bodyMedium" style={styles.cardTitle}>
                {formatDate(menu.date, 'EEEE, MMM d')}
              </Text>
            </View>
            <Chip
              style={[
                styles.statusChip,
                {
                  backgroundColor:
                    menu.status === 'active'
                      ? colors.menuActiveContainer
                      : colors.menuProposedContainer,
                },
              ]}
              textStyle={{
                color: menu.status === 'active'
                  ? colors.menuActive
                  : colors.menuProposed,
                fontWeight: '500',
              }}
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
            <MaterialCommunityIcons
              name="food"
              size={20}
              color={colors.text.secondary}
              style={styles.statIcon}
            />
            <Text variant="labelLarge" style={styles.statValue}>
              {menu.items.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              Total Items
            </Text>
          </View>
          <View style={styles.stat}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={20}
              color={colors.available}
              style={styles.statIcon}
            />
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
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={colors.myReserved}
              style={styles.statIcon}
            />
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

        {isActive && menu.attendees.length > 0 && (
          <View style={styles.attendanceRow}>
            <MaterialCommunityIcons
              name="account-group"
              size={16}
              color={colors.text.secondary}
            />
            <Text variant="bodySmall" style={styles.attendanceText}>
              {menu.attendees.length} attending
            </Text>
          </View>
        )}

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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontWeight: '700',
    fontSize: 32,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '400',
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    ...elevation.level1,
  },
  cardHeader: {
    marginBottom: spacing.sm,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
    marginRight: spacing.sm,
  },
  menuName: {
    fontWeight: '700',
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  cardTitle: {
    fontWeight: '400',
    fontSize: 14,
    color: colors.text.secondary,
  },
  statusChip: {
    marginLeft: spacing.sm,
  },
  proposedBy: {
    color: colors.text.secondary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    marginBottom: spacing.xs,
  },
  statValue: {
    fontWeight: '700',
    fontSize: 24,
    lineHeight: 28,
  },
  statLabel: {
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontSize: 11,
    textAlign: 'center',
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  attendanceText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  itemPreview: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  itemPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
