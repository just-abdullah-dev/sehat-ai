// AsyncStorage utilities for local data persistence
// Note: Auth tokens are stored in expo-secure-store (encrypted), not here.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './constants';
import type { AppSettings } from '@/src/types';

export const storage = {
  // Settings (theme, language, notifications)
  async setSettings(settings: AppSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  },

  async getSettings(): Promise<AppSettings | null> {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  },
};
