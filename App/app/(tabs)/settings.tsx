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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, isGuest, user } = useAuth();
  const { theme, toggleTheme, language, setLanguage, settings, updateSettings } = useTheme();
  const colors = Colors[theme];

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings.notificationsEnabled
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const avatarStorageKey = React.useMemo(() => `@sehatai_avatar_${user?.id ?? 'guest'}`, [user?.id]);

  React.useEffect(() => {
    const loadAvatar = async () => {
      try {
        const saved = await AsyncStorage.getItem(avatarStorageKey);
        setAvatarUri(saved);
      } catch {
        setAvatarUri(null);
      }
    };
    loadAvatar();
  }, [avatarStorageKey]);

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
            router.replace('/login');
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
        {/* Guest Banner */}
        {isGuest && (
          <TouchableOpacity
            style={[styles.guestBanner, { backgroundColor: colors.tint + '15' }]}
            onPress={() => router.push('/login')}
          >
            <Ionicons name="person-add-outline" size={20} color={colors.tint} />
            <Text style={[styles.guestBannerText, { color: colors.tint }]}>
              Sign in to unlock all features
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.tint} />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.icon }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{isGuest ? 'Guest User' : (user?.username || 'User')}</Text>
          </View>
          <TouchableOpacity
            onPress={() => isGuest ? router.push('/login') : router.push('/(tabs)/profile')}
          >
            <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
              {avatarUri && !isGuest ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name={isGuest ? 'log-in-outline' : 'person'} size={24} color={colors.tint} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>Manage your app preferences</Text>
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

          {!isGuest && (
            <>
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
            </>
          )}
        </Card>

        {/* Data & Privacy */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Data & Privacy
          </Text>

          {!isGuest && (
            <SettingItem
              icon="cloud-download-outline"
              title="Download My Data"
              subtitle="Export all your scan history"
              onPress={() => Alert.alert('Info', 'Data export will be available soon')}
            />
          )}

          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy Policy"
            onPress={() => router.push('/privacy-policy')}
          />

          <SettingItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={() => router.push('/terms-of-service')}
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
          {isGuest ? (
            <>
              <Button
                title="Sign In"
                onPress={() => router.push('/login')}
                style={styles.logoutButton}
              />
              <Button
                title="Create Account"
                variant="outline"
                onPress={() => router.push('/signup')}
                style={styles.deleteButton}
              />
            </>
          ) : (
            <>
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
            </>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
         
          <Text style={[styles.footerText, { color: colors.icon }]}>
            © 2026  Sehat AI - TB & Pneumonia Detection | Pak-Austria Fachhochschule
          </Text>
          <Text style={[styles.nameFooterText, { color: colors.icon }]}>
            Built by Abdullah & Abbas
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
    paddingTop: 60,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  guestBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 14 },
  userName: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  titleBlock: {
    marginBottom: 16,
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
  nameFooterText: {
    fontSize: 10,
    marginBottom: 4,
    textAlign: 'center',
    color: Colors.light.icon,
  },
});
