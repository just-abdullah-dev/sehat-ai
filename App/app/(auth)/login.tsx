// Login Screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { useLanguage } from '@/src/hooks/useLanguage';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { loginSchema } from '@/src/utils/validation';
import { StatusBar } from 'expo-status-bar';
import type { LoginCredentials } from '@/src/types';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { login, continueAsGuest } = useAuth();
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const colors = Colors[theme];
  const [isLoading, setIsLoading] = useState(false);

  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  const handleGuestAccess = () => {
    continueAsGuest();
    router.replace('/(tabs)');
  };

  const handleLogin = async (values: LoginCredentials) => {
    setIsLoading(true);
    try {
      await login(values);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const err = error as Error;
      Alert.alert(
        t('auth.loginFailed'),
        err.message || t('auth.invalidCredentials')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text, textAlign }]}>
              {t('auth.welcomeTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.icon, textAlign }]}>
              {t('auth.welcomeSubtitle')}
            </Text>
          </View>

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginSchema}
            onSubmit={handleLogin}
          >
            {({
              handleChange,
              handleBlur,
              handleSubmit,
              values,
              errors,
              touched,
            }) => (
              <View style={styles.form}>
                <Input
                  label={t('auth.email')}
                  placeholder={t('auth.emailPlaceholder')}
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  error={errors.email}
                  touched={touched.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  icon="mail-outline"
                />

                <Input
                  label={t('auth.password')}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  error={errors.password}
                  touched={touched.password}
                  secureTextEntry
                  icon="lock-closed-outline"
                />

                <TouchableOpacity style={[styles.forgotPassword, { alignSelf: isRTL ? 'flex-start' : 'flex-end' }]}>
                  <Text style={[styles.forgotPasswordText, { color: colors.tint }]}>
                    {t('auth.forgotPassword')}
                  </Text>
                </TouchableOpacity>

                <Button
                  title={t('auth.loginButton')}
                  onPress={handleSubmit as any}
                  loading={isLoading}
                  style={styles.loginButton}
                />

                <View style={[styles.signupContainer, { flexDirection: rowDirection }]}>
                  <Text style={[styles.signupText, { color: colors.icon, textAlign }]}>
                    {t('auth.dontHaveAccount')}{' '}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/signup')}>
                    <Text style={[styles.signupLink, { color: colors.tint }]}>
                      {t('auth.signUp')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: colors.icon }]} />
                  <Text style={[styles.dividerText, { color: colors.icon }]}>
                    {t('auth.or')}
                  </Text>
                  <View style={[styles.divider, { backgroundColor: colors.icon }]} />
                </View>

                <Button
                  title={t('auth.continueAsGuest')}
                  variant="outline"
                  onPress={handleGuestAccess}
                  style={styles.guestButton}
                />

              </View>
            )}
          </Formik>
        </ScrollView>

        <LoadingSpinner visible={isLoading} message={t('auth.loggingIn')} />
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    marginBottom: 24,
  },
  signupContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
  },
  guestButton: {
    marginBottom: 24,
  },
});
