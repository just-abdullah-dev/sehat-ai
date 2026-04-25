// Tabs Layout

import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const colors = Colors[theme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme === 'dark' ? '#1A1A1A' : '#ffffff',
          borderTopColor: theme === 'dark' ? '#2A2A2A' : '#E5E5E5',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('navigation.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('navigation.history'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('navigation.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('navigation.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size || 24} color={color} />
          ),
        }}
      />
      {/* Hide explore screen if it still exists */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide this tab
        }}
      />
    </Tabs>
  );
}
