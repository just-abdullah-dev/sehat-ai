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
  Modal,
  TextInput,
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
import { Ionicons } from '@expo/vector-icons';
import { passwordResetApi } from '@/src/services/api';
import type { LoginCredentials } from '@/src/types';

// ─── Reset steps ──────────────────────────────────────────────────────────────
type ResetStep = 'email' | 'otp' | 'newPassword';

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

  // ── Forgot-password modal state ──────────────────────────────────────────
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetInfo, setResetInfo] = useState('');

  const openResetModal = () => {
    setResetStep('email');
    setResetEmail('');
    setResetOtp('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetError('');
    setResetInfo('');
    setResetModalVisible(true);
  };

  const closeResetModal = () => {
    setResetModalVisible(false);
    setResetError('');
    setResetInfo('');
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Step 1 — request OTP
  const handleRequestOtp = async () => {
    const normalizedEmail = resetEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setResetError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetError('');
    setResetInfo('');
    setResetLoading(true);
    try {
      await passwordResetApi.requestOtp(normalizedEmail);
      setResetEmail(normalizedEmail);
      setResetInfo('A 6-digit OTP has been sent to your email.');
      setResetStep('otp');
    } catch (err: unknown) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2 — verify OTP
  const handleVerifyOtp = async () => {
    const sanitizedOtp = resetOtp.trim();
    if (sanitizedOtp.length !== 6) {
      setResetError('Please enter the 6-digit OTP.');
      return;
    }

    setResetError('');
    setResetInfo('');
    setResetLoading(true);
    try {
      await passwordResetApi.verifyOtp(resetEmail.trim().toLowerCase(), sanitizedOtp);
      setResetInfo('OTP verified. Please choose a new password.');
      setResetStep('newPassword');
    } catch (err: unknown) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  // Step 3 — set new password
  const handleResetPassword = async () => {
    if (resetNewPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetError('');
    setResetInfo('');
    setResetLoading(true);
    try {
      await passwordResetApi.resetPassword(
        resetEmail.trim().toLowerCase(),
        resetOtp.trim(),
        resetNewPassword,
      );
      setResetInfo('');
      Alert.alert('Success', 'Your password has been reset. You can now log in.', [
        { text: 'OK', onPress: closeResetModal },
      ]);
    } catch (err: unknown) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  // ── Login ────────────────────────────────────────────────────────────────
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

  // ── Step indicator ───────────────────────────────────────────────────────
  const stepTitles: Record<ResetStep, string> = {
    email: 'Forgot Password',
    otp: 'Enter OTP',
    newPassword: 'New Password',
  };

  const cardBg = theme === 'dark' ? '#1E1E1E' : '#fff';
  const inputBg = theme === 'dark' ? '#2A2A2A' : '#F5F5F5';

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

                <TouchableOpacity
                  style={[styles.forgotPassword, { alignSelf: isRTL ? 'flex-start' : 'flex-end' }]}
                  onPress={openResetModal}
                >
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

      {/* ─── Password Reset Modal ─────────────────────────────────────────── */}
      <Modal
        visible={resetModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeResetModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
            <View style={styles.modalHeader}>
              {resetStep !== 'email' && (
                <TouchableOpacity
                  onPress={() => setResetStep(resetStep === 'newPassword' ? 'otp' : 'email')}
                  style={styles.backBtn}
                >
                  <Ionicons name="chevron-back" size={22} color={colors.tint} />
                </TouchableOpacity>
              )}
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {stepTitles[resetStep]}
              </Text>
              <TouchableOpacity onPress={closeResetModal} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.icon} />
              </TouchableOpacity>
            </View>

            <View style={styles.dots}>
              {(['email', 'otp', 'newPassword'] as ResetStep[]).map((s) => (
                <View
                  key={s}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: s === resetStep ? colors.tint : colors.tint + '30',
                      width: s === resetStep ? 20 : 8,
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.modalBody}>
              {resetStep === 'email' && (
                <>
                  <Text style={[styles.modalDesc, { color: colors.icon }]}>
                    Enter your account email. We will send a 6-digit OTP code.
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: inputBg, color: colors.text, borderColor: colors.border },
                    ]}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.icon}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Button
                    title={resetLoading ? 'Sending...' : 'Send OTP'}
                    onPress={handleRequestOtp}
                    loading={resetLoading}
                    style={styles.actionBtn}
                  />
                </>
              )}

              {resetStep === 'otp' && (
                <>
                  <Text style={[styles.modalDesc, { color: colors.icon }]}>
                    Enter the 6-digit OTP sent to{' '}
                    <Text style={{ color: colors.tint, fontWeight: '600' }}>{resetEmail}</Text>.
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      styles.otpInput,
                      { backgroundColor: inputBg, color: colors.text, borderColor: colors.border },
                    ]}
                    value={resetOtp}
                    onChangeText={(value) => setResetOtp(value.replace(/[^0-9]/g, ''))}
                    placeholder="6-digit OTP"
                    placeholderTextColor={colors.icon}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <Button
                    title={resetLoading ? 'Verifying...' : 'Verify OTP'}
                    onPress={handleVerifyOtp}
                    loading={resetLoading}
                    style={styles.actionBtn}
                  />
                  <TouchableOpacity
                    onPress={handleRequestOtp}
                    style={styles.resendLink}
                    disabled={resetLoading}
                  >
                    <Text style={[styles.resendText, { color: colors.tint }]}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}

              {resetStep === 'newPassword' && (
                <>
                  <Text style={[styles.modalDesc, { color: colors.icon }]}>
                    Set a strong new password with at least 8 characters.
                  </Text>
                  <Input
                    label=""
                    placeholder="New password"
                    value={resetNewPassword}
                    onChangeText={setResetNewPassword}
                    secureTextEntry
                    style={styles.passwordInput}
                  />
                  <Input
                    label=""
                    placeholder="Confirm password"
                    value={resetConfirmPassword}
                    onChangeText={setResetConfirmPassword}
                    secureTextEntry
                    style={styles.passwordInput}
                  />
                  <Button
                    title={resetLoading ? 'Resetting...' : 'Reset Password'}
                    onPress={handleResetPassword}
                    loading={resetLoading}
                    style={styles.actionBtn}
                  />
                </>
              )}

              {Boolean(resetInfo) && (
                <Text style={[styles.feedbackText, { color: '#2E8B57' }]}>{resetInfo}</Text>
              )}
              {Boolean(resetError) && (
                <Text style={[styles.feedbackText, { color: '#FF6B6B' }]}>{resetError}</Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { marginBottom: 40, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 16 },
  form: { width: '100%' },
  forgotPassword: { marginBottom: 24 },
  forgotPasswordText: { fontSize: 14, fontWeight: '600' },
  loginButton: { marginBottom: 24 },
  signupContainer: { justifyContent: 'center', alignItems: 'center' },
  signupText: { fontSize: 14 },
  signupLink: { fontSize: 14, fontWeight: '600' },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: { flex: 1, height: 1, opacity: 0.3 },
  dividerText: { marginHorizontal: 16, fontSize: 14, fontWeight: '600' },
  guestButton: { marginBottom: 24 },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: { padding: 4 },
  closeBtn: { padding: 4 },
  modalTitle: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  dot: { height: 8, borderRadius: 4 },
  modalBody: { gap: 8 },
  modalDesc: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 16,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 8,
  },
  passwordInput: {
    marginBottom: 6,
  },
  actionBtn: { marginTop: 20 },
  resendLink: { alignItems: 'center', marginTop: 12 },
  resendText: { fontSize: 14, fontWeight: '600' },
  feedbackText: { fontSize: 13, marginTop: 10, lineHeight: 18, textAlign: 'center' },
});

