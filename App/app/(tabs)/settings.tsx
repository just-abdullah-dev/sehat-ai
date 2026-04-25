import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useLanguage } from '@/src/hooks/useLanguage';

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { logout, isGuest, user } = useAuth();
  const { theme, toggleTheme, settings, updateSettings } = useTheme();
  const { language, setLanguage, isRTL } = useLanguage();
  const colors = Colors[theme];

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    settings.notificationsEnabled
  );
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const avatarStorageKey = React.useMemo(() => `@sehatai_avatar_${user?.id ?? 'guest'}`, [user?.id]);

  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

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
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
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
      t('settings.deleteAccount'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(t('common.info'), t('settings.deleteAccountNotImplemented'));
          },
        },
      ]
    );
  };

  const handleSelectLanguage = async (lang: 'en' | 'ur' | 'ps') => {
    setShowLanguageModal(false);
    await setLanguage(lang);
  };

  const getLanguageName = (lang: 'en' | 'ur' | 'ps') => {
    switch (lang) {
      case 'en':
        return t('common.english');
      case 'ur':
        return `${t('common.urdu')} (اردو)`;
      case 'ps':
        return `${t('common.pashto')} (پښتو)`;
      default:
        return '';
    }
  };

  const LanguageOption = ({ lang }: { lang: 'en' | 'ur' | 'ps' }) => (
    <TouchableOpacity
      style={[
        styles.languageOption,
        {
          backgroundColor: language === lang ? colors.tint + '20' : 'transparent',
          borderLeftColor: language === lang ? colors.tint : 'transparent',
          flexDirection: rowDirection,
        },
      ]}
      onPress={() => handleSelectLanguage(lang)}
    >
      <Text
        style={[
          styles.languageOptionText,
          {
            color: language === lang ? colors.tint : colors.text,
            fontWeight: language === lang ? '700' : '500',
            textAlign,
          },
        ]}
      >
        {getLanguageName(lang)}
      </Text>
      {language === lang && (
        <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
      )}
    </TouchableOpacity>
  );

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
      style={[styles.settingItem, { flexDirection: rowDirection }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingLeft, { flexDirection: rowDirection }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
          <Ionicons name={icon} size={20} color={colors.tint} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: colors.text, textAlign }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.icon, textAlign }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement || (
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={20}
          color={colors.icon}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {isGuest && (
          <TouchableOpacity
            style={[styles.guestBanner, { backgroundColor: colors.tint + '15', flexDirection: rowDirection }]}
            onPress={() => router.push('/login')}
          >
            <Ionicons name="person-add-outline" size={20} color={colors.tint} />
            <Text style={[styles.guestBannerText, { color: colors.tint, textAlign }]}>
              {t('settings.guestBanner')}
            </Text>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={16}
              color={colors.tint}
            />
          </TouchableOpacity>
        )}

        <View style={[styles.header, { flexDirection: rowDirection }]}> 
          <View>
            <Text style={[styles.greeting, { color: colors.icon, textAlign }]}>{t('settings.welcomeBack')}</Text>
            <Text style={[styles.userName, { color: colors.text, textAlign }]}>
              {isGuest ? t('settings.guestUser') : (user?.username || 'User')}
            </Text>
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
          <Text style={[styles.title, { color: colors.text, textAlign }]}>{t('settings.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.icon, textAlign }]}>{t('settings.subtitle')}</Text>
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign }]}>
            {t('settings.appearance')}
          </Text>

          <SettingItem
            icon="moon-outline"
            title={t('settings.darkMode')}
            subtitle={t('settings.darkModeStatus', {
              status: theme === 'dark' ? t('settings.enabled') : t('settings.disabled'),
            })}
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
            title={t('settings.language')}
            subtitle={getLanguageName(language)}
            onPress={() => setShowLanguageModal(true)}
          />
        </Card>

        {/* <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign }]}>
            {t('settings.notifications')}
          </Text>

          <SettingItem
            icon="notifications-outline"
            title={t('settings.pushNotifications')}
            subtitle={t('settings.pushNotificationsSubtitle')}
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
                title={t('settings.scanReminders')}
                subtitle={t('settings.scanRemindersSubtitle')}
                onPress={() => Alert.alert(t('common.info'), t('common.comingSoon'))}
              />

              <SettingItem
                icon="medical-outline"
                title={t('settings.medicationReminders')}
                subtitle={t('settings.medicationRemindersSubtitle')}
                onPress={() => Alert.alert(t('common.info'), t('common.comingSoon'))}
              />
            </>
          )}
        </Card> */}

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign }]}>
            {t('settings.dataPrivacy')}
          </Text>

          {/* {!isGuest && (
            <SettingItem
              icon="cloud-download-outline"
              title={t('settings.downloadData')}
              subtitle={t('settings.downloadDataSubtitle')}
              onPress={() => Alert.alert(t('common.info'), t('common.comingSoon'))}
            />
          )} */}

          <SettingItem
            icon="shield-checkmark-outline"
            title={t('settings.privacyPolicy')}
            onPress={() => router.push('/privacy-policy')}
          />

          <SettingItem
            icon="document-text-outline"
            title={t('settings.termsOfService')}
            onPress={() => router.push('/terms-of-service')}
          />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text, textAlign }]}>
            {t('settings.about')}
          </Text>

          <SettingItem
            icon="information-circle-outline"
            title={t('settings.appVersion')}
            subtitle="1.0.0"
          />

          <SettingItem
            icon="help-circle-outline"
            title={t('settings.helpSupport')}
            onPress={() => Alert.alert(t('settings.helpSupport'), t('settings.helpSupportBody'))}
          />

          <SettingItem
            icon="star-outline"
            title={t('settings.rateApp')}
            onPress={() => Alert.alert(t('settings.rateApp'), t('settings.rateAppBody'))}
          />
        </Card>

        <View style={styles.actionSection}>
          {isGuest ? (
            <>
              <Button
                title={t('settings.signIn')}
                onPress={() => router.push('/login')}
                style={styles.logoutButton}
              />
              {/* <Button
                title={t('settings.createAccount')}
                variant="outline"
                onPress={() => router.push('/signup')}
                style={styles.deleteButton}
              /> */}
            </>
          ) : (
            <>
              <Button
                title={t('settings.logout')}
                variant="outline"
                onPress={handleLogout}
                style={styles.logoutButton}
              />

              {/* <Button
                title={t('settings.deleteAccount')}
                variant="danger"
                onPress={handleDeleteAccount}
                style={styles.deleteButton}
              /> */}
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.icon, textAlign }]}>
            {t('settings.footer')}
          </Text>
          <Text style={[styles.nameFooterText, { color: colors.icon, textAlign }]}>
            {t('settings.builtBy')}
          </Text>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.background + 'E6' }]}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.background, borderColor: colors.tint },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                { color: colors.text, textAlign },
              ]}
            >
              {t('settings.selectLanguage')}
            </Text>

            <LanguageOption lang="en" />
            <LanguageOption lang="ur" />
            <LanguageOption lang="ps" />

            <TouchableOpacity
              style={[styles.modalCloseButton, { borderTopColor: colors.icon + '30' }]}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.icon }]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  settingLeft: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 12,
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
  },
  nameFooterText: {
    fontSize: 10,
    marginBottom: 4,
  },
  /* Language Modal Styles */
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    minWidth: '80%',
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#00000010',
  },
  languageOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  languageOptionText: {
    fontSize: 16,
    flex: 1,
  },
  modalCloseButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
