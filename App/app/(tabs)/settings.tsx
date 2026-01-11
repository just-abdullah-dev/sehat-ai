// Settings Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, toggleTheme, language, setLanguage, settings, updateSettings } = useTheme();
  const colors = Colors[theme];

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings.notificationsEnabled
  );

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await updateSettings({ notificationsEnabled: value });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Implement delete account logic
            Alert.alert('Info', 'Account deletion is not implemented yet');
          },
        },
      ]
    );
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
          <Ionicons name={icon} size={20} color={colors.tint} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.icon }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement || (
        <Ionicons name="chevron-forward" size={20} color={colors.icon} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Manage your app preferences
          </Text>
        </View>

        {/* Appearance */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Appearance
          </Text>

          <SettingItem
            icon="moon-outline"
            title="Dark Mode"
            subtitle={`Currently ${theme === 'dark' ? 'enabled' : 'disabled'}`}
            rightElement={
              <Switch
                value={theme === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: '#ccc', true: colors.tint }}
                thumbColor="#fff"
              />
            }
          />

          <SettingItem
            icon="language-outline"
            title="Language"
            subtitle={language === 'en' ? 'English' : 'Urdu'}
            onPress={() => {
              Alert.alert(
                'Select Language',
                '',
                [
                  {
                    text: 'English',
                    onPress: () => setLanguage('en'),
                  },
                  {
                    text: 'Urdu (اردو)',
                    onPress: () => setLanguage('ur'),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          />
        </Card>

        {/* Notifications */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Notifications
          </Text>

          <SettingItem
            icon="notifications-outline"
            title="Push Notifications"
            subtitle="Receive scan reminders and updates"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#ccc', true: colors.tint }}
                thumbColor="#fff"
              />
            }
          />

          <SettingItem
            icon="alarm-outline"
            title="Scan Reminders"
            subtitle="Remind me to scan every 14 days"
            onPress={() => Alert.alert('Info', 'This feature is coming soon')}
          />

          <SettingItem
            icon="medical-outline"
            title="Medication Reminders"
            subtitle="Set up medication schedules"
            onPress={() => Alert.alert('Info', 'This feature is coming soon')}
          />
        </Card>

        {/* Data & Privacy */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Data & Privacy
          </Text>

          <SettingItem
            icon="cloud-download-outline"
            title="Download My Data"
            subtitle="Export all your scan history"
            onPress={() => Alert.alert('Info', 'Data export will be available soon')}
          />

          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Your data is encrypted and secure.')}
          />

          <SettingItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => Alert.alert('Terms of Service', 'By using this app, you agree to our terms.')}
          />
        </Card>

        {/* About */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            About
          </Text>

          <SettingItem
            icon="information-circle-outline"
            title="App Version"
            subtitle="1.0.0"
          />

          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => Alert.alert('Support', 'Contact us at support@sehatai.com')}
          />

          <SettingItem
            icon="star-outline"
            title="Rate the App"
            onPress={() => Alert.alert('Thank You!', 'Redirecting to app store...')}
          />
        </Card>

        {/* Account Actions */}
        <View style={styles.actionSection}>
          <Button
            title="Logout"
            variant="outline"
            onPress={handleLogout}
            style={styles.logoutButton}
          />

          <Button
            title="Delete Account"
            variant="danger"
            onPress={handleDeleteAccount}
            style={styles.deleteButton}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            Sehat AI - TB & Pneumonia Detection
          </Text>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            Developed by Abdullah, Abbas & Ikramullah
          </Text>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            © 2024 Pak-Austria Fachhochschule
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
  },
  actionSection: {
    marginTop: 16,
    gap: 12,
  },
  logoutButton: {
    marginBottom: 0,
  },
  deleteButton: {
    marginBottom: 0,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
});
