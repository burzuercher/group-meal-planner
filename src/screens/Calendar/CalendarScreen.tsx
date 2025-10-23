import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, FAB, Chip, ActivityIndicator } from 'react-native-paper';
import { Calendar, DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Screen, EmptyState } from '../../components';
import { colors, spacing, borderRadius } from '../../theme';
import { useAppStore } from '../../store';
import { getMenusInRange } from '../../services/menuService';
import { Menu, RootStackParamList } from '../../types';
import { formatDateKey, parseDateKey, formatDate } from '../../utils/dateUtils';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';

type CalendarScreenNavigationProp = StackNavigationProp<RootStackParamList>;

export default function CalendarScreen() {
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const currentGroupId = useAppStore((state) => state.currentGroupId);

  const [selectedDate, setSelectedDate] = useState<string>(
    formatDateKey(new Date())
  );
  const [menus, setMenus] = useState<Menu[]>([]);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (currentGroupId) {
      loadMenus();
    }
  }, [currentGroupId, currentMonth]);

  const loadMenus = async () => {
    if (!currentGroupId) return;

    setLoading(true);
    try {
      const start = startOfMonth(addMonths(currentMonth, -1));
      const end = endOfMonth(addMonths(currentMonth, 1));

      const fetchedMenus = await getMenusInRange(currentGroupId, start, end);
      setMenus(fetchedMenus);
      updateMarkedDates(fetchedMenus);
    } catch (error) {
      console.error('Error loading menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMarkedDates = (menuList: Menu[]) => {
    const marked: any = {};

    // Mark all menu dates
    menuList.forEach((menu) => {
      const dateKey = formatDateKey(menu.date);
      marked[dateKey] = {
        marked: true,
        dotColor: menu.status === 'active' ? colors.primary : colors.warning,
      };
    });

    // Highlight selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
    }

    setMarkedDates(marked);
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    updateMarkedDates(menus);

    // Find menu for this date
    const menuForDate = menus.find(
      (menu) => formatDateKey(menu.date) === day.dateString
    );

    if (menuForDate) {
      // Navigate to menu details
      navigation.navigate('MenuDetails', {
        menuId: menuForDate.id,
        dateString: day.dateString,
      });
    }
  };

  const handleMonthChange = (date: DateData) => {
    setCurrentMonth(new Date(date.year, date.month - 1, 1));
  };

  const handleProposeMenu = () => {
    const dateString = selectedDate || formatDateKey(new Date());
    navigation.navigate('ProposeMenu', { dateString });
  };

  const selectedMenu = menus.find(
    (menu) => formatDateKey(menu.date) === selectedDate
  );

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

  return (
    <Screen>
      <ScrollView style={styles.container}>
        <Calendar
          current={formatDateKey(currentMonth)}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          markedDates={markedDates}
          theme={{
            backgroundColor: colors.background,
            calendarBackground: colors.surface,
            textSectionTitleColor: colors.text.secondary,
            selectedDayBackgroundColor: colors.primary,
            selectedDayTextColor: colors.text.onPrimary,
            todayTextColor: colors.primary,
            dayTextColor: colors.text.primary,
            textDisabledColor: colors.text.disabled,
            dotColor: colors.primary,
            selectedDotColor: colors.text.onPrimary,
            arrowColor: colors.primary,
            monthTextColor: colors.text.primary,
            textDayFontWeight: '400',
            textMonthFontWeight: '600',
            textDayHeaderFontWeight: '500',
          }}
        />

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text variant="bodySmall" style={styles.legendText}>
              Active Menu
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text variant="bodySmall" style={styles.legendText}>
              Proposed Menu
            </Text>
          </View>
        </View>

        {selectedDate && (
          <View style={styles.selectedDateCard}>
            <Text variant="titleMedium" style={styles.selectedDateTitle}>
              {formatDate(parseDateKey(selectedDate), 'EEEE, MMMM d, yyyy')}
            </Text>

            {loading ? (
              <ActivityIndicator style={styles.loader} />
            ) : selectedMenu ? (
              <View style={styles.menuInfo}>
                <View style={styles.menuHeader}>
                  <Chip
                    style={[
                      styles.statusChip,
                      {
                        backgroundColor:
                          selectedMenu.status === 'active'
                            ? colors.primaryContainer
                            : colors.warning,
                      },
                    ]}
                  >
                    {selectedMenu.status === 'active' ? 'Active' : 'Proposed'}
                  </Chip>
                </View>
                <Text variant="bodyMedium" style={styles.proposedBy}>
                  Proposed by {selectedMenu.proposedBy}
                </Text>
                <Text
                  variant="bodySmall"
                  style={styles.tapToView}
                  onPress={() =>
                    navigation.navigate('MenuDetails', {
                      menuId: selectedMenu.id,
                      dateString: formatDateKey(selectedMenu.date),
                    })
                  }
                >
                  Tap to view menu details →
                </Text>
              </View>
            ) : (
              <View style={styles.noMenu}>
                <Text variant="bodyMedium" style={styles.noMenuText}>
                  No menu planned for this date
                </Text>
                <Text variant="bodySmall" style={styles.noMenuHint}>
                  Tap the + button to propose a menu
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleProposeMenu}
        label="Propose Menu"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: colors.text.secondary,
  },
  selectedDateCard: {
    margin: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
  },
  selectedDateTitle: {
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  loader: {
    marginVertical: spacing.md,
  },
  menuInfo: {
    gap: spacing.sm,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  proposedBy: {
    color: colors.text.secondary,
  },
  tapToView: {
    color: colors.primary,
    marginTop: spacing.sm,
  },
  noMenu: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noMenuText: {
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  noMenuHint: {
    color: colors.text.disabled,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.primary,
  },
});
