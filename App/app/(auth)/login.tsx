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
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { loginSchema } from '@/src/utils/validation';
import { StatusBar } from 'expo-status-bar';
import type { LoginCredentials } from '@/src/types';

export default function LoginScreen() {
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [isLoading, setIsLoading] = useState(false);

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
      Alert.alert('Login Failed', err.message || 'Invalid credentials. Please check your email and password.');
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
            <Text style={[styles.title, { color: colors.text }]}>
              Welcome to Sehat AI
            </Text>
            <Text style={[styles.subtitle, { color: colors.icon }]}>
              AI-powered TB & Pneumonia Detection
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
                  label="Email"
                  placeholder="Enter your email"
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
                  label="Password"
                  placeholder="Enter your password"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  error={errors.password}
                  touched={touched.password}
                  secureTextEntry
                  icon="lock-closed-outline"
                />

                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={[styles.forgotPasswordText, { color: colors.tint }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                <Button
                  title="Login"
                  onPress={handleSubmit as any}
                  loading={isLoading}
                  style={styles.loginButton}
                />

                <View style={styles.signupContainer}>
                  <Text style={[styles.signupText, { color: colors.icon }]}>
                    Don't have an account?{' '}
                  </Text>
                  <TouchableOpacity onPress={() => router.push('/signup')}>
                    <Text style={[styles.signupLink, { color: colors.tint }]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dividerContainer}>
                  <View style={[styles.divider, { backgroundColor: colors.icon }]} />
                  <Text style={[styles.dividerText, { color: colors.icon }]}>OR</Text>
                  <View style={[styles.divider, { backgroundColor: colors.icon }]} />
                </View>

                <Button
                  title="Continue as Guest"
                  variant="outline"
                  onPress={handleGuestAccess}
                  style={styles.guestButton}
                />

              </View>
            )}
          </Formik>
        </ScrollView>

        <LoadingSpinner visible={isLoading} message="Logging in..." />
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
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
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
    flexDirection: 'row',
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
