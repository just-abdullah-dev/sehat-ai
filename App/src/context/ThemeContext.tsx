// Theme Context - Manages app theme (light/dark mode)

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { storage } from '@/src/utils/storage';
import type { AppSettings } from '@/src/types';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: 'en' | 'ur';
  setLanguage: (lang: 'en' | 'ur') => void;
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: 'light',
  language: 'en',
  notificationsEnabled: true,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useRNColorScheme();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await storage.getSettings();
      if (storedSettings) {
        setSettings(storedSettings);
      } else {
        // Use system theme as default
        const initialSettings = {
          ...defaultSettings,
          theme: systemColorScheme === 'dark' ? 'dark' : 'light',
        };
        setSettings(initialSettings);
        await storage.setSettings(initialSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = settings.theme === 'light' ? 'dark' : 'light';
    const newSettings = { ...settings, theme: newTheme };
    setSettings(newSettings);
    await storage.setSettings(newSettings);
  };

  const setLanguage = async (lang: 'en' | 'ur') => {
    const newSettings = { ...settings, language: lang };
    setSettings(newSettings);
    await storage.setSettings(newSettings);
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    await storage.setSettings(updatedSettings);
  };

  const value: ThemeContextType = {
    theme: settings.theme,
    toggleTheme,
    language: settings.language,
    setLanguage,
    settings,
    updateSettings,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
