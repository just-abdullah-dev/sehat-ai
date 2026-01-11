// Push Notifications Utility

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const notifications = {
  // Request permissions
  async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log('Notifications only work on physical devices');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return false;
    }

    return true;
  },

  // Get push token (for backend registration)
  async getPushToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Replace with your Expo project ID
      });
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  },

  // Schedule local notification
  async scheduleNotification(
    title: string,
    body: string,
    trigger: Date | number
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger:
        typeof trigger === 'number'
          ? { seconds: trigger }
          : trigger,
    });

    return id;
  },

  // Schedule scan reminder (14 days from now)
  async scheduleScanReminder(): Promise<string> {
    const trigger = new Date();
    trigger.setDate(trigger.getDate() + 14); // 14 days from now

    return await this.scheduleNotification(
      'Scan Reminder',
      'Time for your next health checkup. Upload a new X-ray scan.',
      trigger
    );
  },

  // Schedule medication reminder
  async scheduleMedicationReminder(
    medicineName: string,
    time: Date
  ): Promise<string> {
    return await this.scheduleNotification(
      'Medication Reminder',
      `Time to take your ${medicineName}`,
      time
    );
  },

  // Cancel all notifications
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  // Cancel specific notification
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  // Add notification listener
  addNotificationListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  },

  // Add notification response listener (when user taps notification)
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  },
};
