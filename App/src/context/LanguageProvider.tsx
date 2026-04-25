import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';
import { storage } from '@/src/utils/storage';
import { STORAGE_KEYS } from '@/src/utils/constants';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DevSettings, I18nManager } from 'react-native';

export type AppLanguage = 'en' | 'ur' | 'ps';

interface LanguageContextType {
  language: AppLanguage;
  isRTL: boolean;
  isReady: boolean;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const RTL_LANGS: AppLanguage[] = ['ur', 'ps'];

const isRtlLanguage = (lang: AppLanguage): boolean => RTL_LANGS.includes(lang);

const applyRtlDirection = (lang: AppLanguage): boolean => {
  const shouldBeRTL = isRtlLanguage(lang);
  if (I18nManager.isRTL === shouldBeRTL) {
    return false;
  }

  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  return true;
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [isReady, setIsReady] = useState(false);

  const persistLanguage = useCallback(async (lang: AppLanguage) => {
    await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);

    const existingSettings = await storage.getSettings();
    if (existingSettings) {
      await storage.setSettings({ ...existingSettings, language: lang });
    }
  }, []);

  const initializeLanguage = useCallback(async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
      const storedSettings = await storage.getSettings();
      const initialLanguage =
        (savedLanguage as AppLanguage | null) ??
        (storedSettings?.language as AppLanguage | undefined) ??
        'en';

      await i18n.changeLanguage(initialLanguage);
      setLanguageState(initialLanguage);

      const directionChanged = applyRtlDirection(initialLanguage);
      if (directionChanged) {
        DevSettings.reload();
        return;
      }

      setIsReady(true);
    } catch {
      await i18n.changeLanguage('en');
      setLanguageState('en');
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  const setLanguage = useCallback(async (lang: AppLanguage) => {
    if (lang === language) {
      return;
    }

    await i18n.changeLanguage(lang);
    await persistLanguage(lang);
    setLanguageState(lang);

    const directionChanged = applyRtlDirection(lang);
    if (directionChanged) {
      DevSettings.reload();
    }
  }, [language, persistLanguage]);

  const toggleLanguage = useCallback(async () => {
    await setLanguage(language === 'en' ? 'ur' : 'en');
  }, [language, setLanguage]);

  const value = useMemo<LanguageContextType>(
    () => ({
      language,
      isRTL: isRtlLanguage(language),
      isReady,
      setLanguage,
      toggleLanguage,
    }),
    [language, isReady, setLanguage, toggleLanguage]
  );

  if (!isReady) {
    return null;
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguageContext = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within LanguageProvider');
  }
  return context;
};
