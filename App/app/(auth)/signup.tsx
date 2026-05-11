// Signup Screen

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
import type { RegisterRequest } from '@/src/types';
import { useTheme } from '@/src/context/ThemeContext';
import { useLanguage } from '@/src/hooks/useLanguage';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { signupSchema } from '@/src/utils/validation';
import { StatusBar } from 'expo-status-bar';

export default function SignupScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { register } = useAuth();
  const { theme } = useTheme();
  const { isRTL } = useLanguage();
  const colors = Colors[theme];
  const [isLoading, setIsLoading] = useState(false);

  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  const handleSignup = async (values: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    setIsLoading(true);
    try {
      const payload: RegisterRequest = {
        username: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      };
      await register(payload);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const err = error as Error;
      Alert.alert(
        t('auth.signupFailed'),
        err.message || t('auth.unableToCreate')
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
              {t('auth.createAccountTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.icon, textAlign }]}>
              {t('auth.createAccountSubtitle')}
            </Text>
          </View>

          <Formik
            initialValues={{
              name: '',
              email: '',
              password: '',
              confirmPassword: '',
            }}
            validationSchema={signupSchema}
            onSubmit={handleSignup}
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
                  label={t('auth.fullName')}
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={values.name}
                  onChangeText={handleChange('name')}
                  onBlur={handleBlur('name')}
                  error={errors.name}
                  touched={touched.name}
                  icon="person-outline"
                />

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
                  placeholder={t('auth.createPasswordPlaceholder')}
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  error={errors.password}
                  touched={touched.password}
                  secureTextEntry
                  icon="lock-closed-outline"
                />

                <Input
                  label={t('auth.confirmPassword')}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  value={values.confirmPassword}
                  onChangeText={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  error={errors.confirmPassword}
                  touched={touched.confirmPassword}
                  secureTextEntry
                  icon="lock-closed-outline"
                />

                <Button
                  title={t('auth.signupButton')}
                  onPress={handleSubmit as any}
                  loading={isLoading}
                  style={styles.signupButton}
                />

                <View style={[styles.loginContainer, { flexDirection: rowDirection }]}>
                  <Text style={[styles.loginText, { color: colors.icon, textAlign }]}>
                    {t('auth.alreadyHaveAccount')}{' '}
                  </Text>
                  <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.loginLink, { color: colors.tint }]}>
                      {t('auth.login')}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={[styles.terms, { color: colors.icon, textAlign: 'center', marginBottom: 6 }]}>
                    {t('auth.agreeTerms')}
                  </Text>
                  <View style={{ flexDirection: rowDirection, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                    <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
                      <Text style={[styles.terms, { color: colors.tint, fontWeight: '600' }]}>
                        {t('auth.termsLink')}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.terms, { color: colors.icon }]}>•</Text>
                    <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                      <Text style={[styles.terms, { color: colors.tint, fontWeight: '600' }]}>
                        {t('auth.privacyLink')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </Formik>
        </ScrollView>

        <LoadingSpinner visible={isLoading} message={t('auth.creatingAccount')} />
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
  signupButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  loginContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loginText: {
    fontSize: 14,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  terms: {
    fontSize: 12,
    lineHeight: 18,
  },
});
