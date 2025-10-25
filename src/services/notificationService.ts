import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { addHours, subHours, isBefore, isAfter, parseISO, format } from 'date-fns';
import { Menu, MenuItem, NotificationPreferences } from '../types';

const NOTIFICATION_IDENTIFIER_PREFIX = 'meal_reminder_';

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  mealReminder24h: true,
  mealReminder3h: true,
  mealReminder1h: true,
  notifyReservedItems: true,
  notifyUnassignedItems: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

/**
 * Request notification permissions from the device
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return false;
    }

    // Configure notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('meal-reminders', {
        name: 'Meal Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2e7d32',
        sound: 'default',
      });
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Check current notification permission status
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Register for push notifications and get Expo push token
 * (For future use with push notification backend)
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-project-id', // Replace with your Expo project ID
    });

    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Check if a given date/time falls within quiet hours
 */
function isInQuietHours(
  date: Date,
  preferences: NotificationPreferences
): boolean {
  if (!preferences.quietHoursEnabled) {
    return false;
  }

  const [startHour, startMin] = preferences.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  const startTimeInMinutes = startHour * 60 + startMin;
  const endTimeInMinutes = endHour * 60 + endMin;

  // Handle cases where quiet hours span midnight
  if (startTimeInMinutes > endTimeInMinutes) {
    return timeInMinutes >= startTimeInMinutes || timeInMinutes < endTimeInMinutes;
  }

  return timeInMinutes >= startTimeInMinutes && timeInMinutes < endTimeInMinutes;
}

/**
 * Adjust notification time to avoid quiet hours
 * If scheduled time is in quiet hours, move it to the end of quiet hours
 */
function adjustForQuietHours(
  scheduledTime: Date,
  preferences: NotificationPreferences
): Date {
  if (!isInQuietHours(scheduledTime, preferences)) {
    return scheduledTime;
  }

  // Move to end of quiet hours
  const [endHour, endMin] = preferences.quietHoursEnd.split(':').map(Number);
  const adjusted = new Date(scheduledTime);
  adjusted.setHours(endHour, endMin, 0, 0);

  // If quiet hours end is earlier in the day than the scheduled time,
  // it means quiet hours span midnight, so add a day
  if (adjusted < scheduledTime) {
    adjusted.setDate(adjusted.getDate() + 1);
  }

  return adjusted;
}

/**
 * Generate notification identifier for a specific menu and type
 */
function getNotificationId(menuId: string, type: string): string {
  return `${NOTIFICATION_IDENTIFIER_PREFIX}${menuId}_${type}`;
}

/**
 * Cancel all scheduled notifications for a specific menu
 */
export async function cancelMenuReminders(menuId: string): Promise<void> {
  try {
    const allNotifications = await Notifications.getAllScheduledNotificationsAsync();

    const menuNotifications = allNotifications.filter((notification) =>
      notification.identifier.startsWith(`${NOTIFICATION_IDENTIFIER_PREFIX}${menuId}`)
    );

    for (const notification of menuNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }

    console.log(`Cancelled ${menuNotifications.length} notifications for menu ${menuId}`);
  } catch (error) {
    console.error('Error cancelling menu reminders:', error);
  }
}

/**
 * Schedule all notifications for a given menu
 */
export async function scheduleMenuReminders(
  menu: Menu,
  userReservedItems: MenuItem[],
  preferences: NotificationPreferences,
  isUserAttending: boolean
): Promise<void> {
  try {
    // First, cancel any existing notifications for this menu
    await cancelMenuReminders(menu.id);

    // Don't schedule if notifications are disabled
    if (!preferences.enabled) {
      return;
    }

    // Don't schedule for proposed menus
    if (menu.status !== 'active') {
      return;
    }

    // Don't schedule if user is not attending
    if (!isUserAttending) {
      return;
    }

    const now = new Date();
    const menuDate = menu.date;

    // Don't schedule notifications for past menus
    if (isBefore(menuDate, now)) {
      return;
    }

    const scheduledNotifications: string[] = [];

    // Schedule 24-hour reminder
    if (preferences.mealReminder24h) {
      const reminderTime = subHours(menuDate, 24);
      if (isAfter(reminderTime, now)) {
        const adjustedTime = adjustForQuietHours(reminderTime, preferences);
        await Notifications.scheduleNotificationAsync({
          identifier: getNotificationId(menu.id, '24h'),
          content: {
            title: '🍽️ Tomorrow: ' + menu.name,
            body: `Don't forget - it's at ${format(menuDate, 'h:mm a')}!`,
            data: { menuId: menu.id, type: '24h' },
            sound: 'default',
          },
          trigger: { date: adjustedTime, channelId: 'meal-reminders' },
        });
        scheduledNotifications.push('24h');
      }
    }

    // Schedule 3-hour reminder with reserved items
    if (preferences.mealReminder3h) {
      const reminderTime = subHours(menuDate, 3);
      if (isAfter(reminderTime, now)) {
        const adjustedTime = adjustForQuietHours(reminderTime, preferences);

        let body = `In 3 hours: ${menu.name}`;
        if (preferences.notifyReservedItems && userReservedItems.length > 0) {
          const itemNames = userReservedItems.map((item) => item.name).join(', ');
          body = `In 3 hours: ${menu.name}\nYou're bringing: ${itemNames}`;
        }

        await Notifications.scheduleNotificationAsync({
          identifier: getNotificationId(menu.id, '3h'),
          content: {
            title: '🍽️ Meal Reminder',
            body,
            data: { menuId: menu.id, type: '3h' },
            sound: 'default',
          },
          trigger: { date: adjustedTime, channelId: 'meal-reminders' },
        });
        scheduledNotifications.push('3h');
      }
    }

    // Schedule 1-hour reminder
    if (preferences.mealReminder1h) {
      const reminderTime = subHours(menuDate, 1);
      if (isAfter(reminderTime, now)) {
        const adjustedTime = adjustForQuietHours(reminderTime, preferences);
        await Notifications.scheduleNotificationAsync({
          identifier: getNotificationId(menu.id, '1h'),
          content: {
            title: '🍽️ In 1 hour: ' + menu.name,
            body: 'Get ready! See you soon.',
            data: { menuId: menu.id, type: '1h' },
            sound: 'default',
          },
          trigger: { date: adjustedTime, channelId: 'meal-reminders' },
        });
        scheduledNotifications.push('1h');
      }
    }

    console.log(`Scheduled ${scheduledNotifications.length} notifications for menu ${menu.id}:`, scheduledNotifications);
  } catch (error) {
    console.error('Error scheduling menu reminders:', error);
  }
}

/**
 * Schedule notification for unassigned items
 * Only shown to users who are attending but haven't reserved anything
 */
export async function scheduleUnassignedItemsNotification(
  menu: Menu,
  unassignedItems: MenuItem[],
  hasUserReservedItems: boolean,
  preferences: NotificationPreferences,
  isUserAttending: boolean
): Promise<void> {
  try {
    const notificationId = getNotificationId(menu.id, 'unassigned');

    // Cancel existing unassigned items notification
    await Notifications.cancelScheduledNotificationAsync(notificationId);

    // Don't schedule if notifications are disabled
    if (!preferences.enabled || !preferences.notifyUnassignedItems) {
      return;
    }

    // Don't schedule for proposed menus
    if (menu.status !== 'active') {
      return;
    }

    // Only notify users who are attending but haven't reserved anything
    if (!isUserAttending || hasUserReservedItems) {
      return;
    }

    // Don't notify if there are no unassigned items
    if (unassignedItems.length === 0) {
      return;
    }

    const now = new Date();
    const menuDate = menu.date;

    // Don't schedule for past menus
    if (isBefore(menuDate, now)) {
      return;
    }

    // Schedule notification for 12 hours before the meal (or sooner if meal is soon)
    let reminderTime = subHours(menuDate, 12);
    if (isBefore(reminderTime, now)) {
      // If 12 hours before has passed, schedule for 1 hour from now
      reminderTime = addHours(now, 1);
    }

    const adjustedTime = adjustForQuietHours(reminderTime, preferences);

    const itemCount = unassignedItems.length;
    const itemNames = unassignedItems.slice(0, 3).map((item) => item.name);
    let body = `There ${itemCount === 1 ? 'is' : 'are'} still ${itemCount} ${itemCount === 1 ? 'item' : 'items'} that ${itemCount === 1 ? 'needs' : 'need'} to be brought:\n`;
    body += itemNames.map((name) => `• ${name}`).join('\n');
    if (itemCount > 3) {
      body += `\n• And ${itemCount - 3} more...`;
    }
    body += '\n\nTap to reserve items';

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: `⚠️ Items Need Bringing - ${menu.name}`,
        body,
        data: { menuId: menu.id, type: 'unassigned' },
        sound: 'default',
      },
      trigger: { date: adjustedTime, channelId: 'meal-reminders' },
    });

    console.log(`Scheduled unassigned items notification for menu ${menu.id}`);
  } catch (error) {
    console.error('Error scheduling unassigned items notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all scheduled notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

/**
 * Get count of currently scheduled notifications
 */
export async function getScheduledNotificationCount(): Promise<number> {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.length;
  } catch (error) {
    console.error('Error getting notification count:', error);
    return 0;
  }
}

/**
 * Send a test notification immediately
 */
export async function sendTestNotification(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🍽️ Test Notification',
        body: 'This is a test notification from LifeGroup Food!',
        data: { type: 'test' },
        sound: 'default',
      },
      trigger: { seconds: 1, channelId: 'meal-reminders' },
    });
    console.log('Test notification scheduled');
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
}
