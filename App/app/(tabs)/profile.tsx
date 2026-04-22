// Profile Screen

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Formik } from 'formik';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent, DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { profileSchema } from '@/src/utils/validation';
import type { User, ProfileUpdate } from '@/src/types';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, updateProfile, isGuest } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const profileData: User | null = profile || user;

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);

  const avatarStorageKey = useMemo(
    () => `@sehatai_avatar_${profileData?.id ?? 'guest'}`,
    [profileData?.id]
  );

  useEffect(() => {
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

  const saveAvatar = async (uri: string) => {
    setAvatarUri(uri);
    await AsyncStorage.setItem(avatarStorageKey, uri);
  };

  const removeAvatar = async () => {
    setAvatarUri(null);
    await AsyncStorage.removeItem(avatarStorageKey);
  };

  const pickAvatar = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const cameraPerm = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraPerm.status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required.');
          return;
        }
      } else {
        const galleryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (galleryPerm.status !== 'granted') {
          Alert.alert('Permission Required', 'Gallery permission is required.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });

      if (!result.canceled && result.assets[0]?.uri) {
        await saveAvatar(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Error', 'Unable to update profile picture. Please try again.');
    }
  };

  const openAvatarActions = () => {
    Alert.alert('Profile Picture', 'Choose an action', [
      { text: 'Take Photo', onPress: () => pickAvatar('camera') },
      { text: 'Choose from Gallery', onPress: () => pickAvatar('gallery') },
      ...(avatarUri ? [{ text: 'Remove Picture', style: 'destructive' as const, onPress: () => removeAvatar() }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const avatarInitials = useMemo(() => {
    const name = (profileData?.username || 'User').trim();
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }, [profileData?.username]);

  const calculateAgeBreakdown = (dob?: string) => {
    if (!dob) return null;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return 'Invalid date';

    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();

    if (days < 0) {
      const prevMonthDays = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      days += prevMonthDays;
      months -= 1;
    }
    if (months < 0) {
      months += 12;
      years -= 1;
    }
    if (years < 0) return 'Invalid date';
    return `${years}y ${months}m ${days}d`;
  };

  const formatDob = (dob?: string) => {
    if (!dob) return 'Select date of birth';
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return 'Select date of birth';
    return d.toDateString();
  };

  const genderIcon = (gender?: string): keyof typeof Ionicons.glyphMap => {
    if (gender === 'male') return 'male-outline';
    if (gender === 'female') return 'female-outline';
    if (gender === 'other') return 'transgender-outline';
    return 'person-outline';
  };

  const handleSaveProfile = async (values: {
    name: string;
    email: string;
    phone: string;
    date_of_birth: string;
    gender: string;
  }) => {
    setIsLoading(true);
    try {
      const payload: ProfileUpdate = {
        username: values.name.trim() || undefined,
        phone: values.phone || undefined,
        date_of_birth: values.date_of_birth || undefined,
        gender: (values.gender as User['gender']) || undefined,
      };
      await updateProfile(payload);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: unknown) {
      const err = error as Error;
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderValue = (value?: string | number | null): string => {
    if (value === null || value === undefined || value === '') return 'Not provided';
    const normalized = String(value).trim();
    if (!normalized) return 'Not provided';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.guestOverlay}>
          <View style={[styles.guestContent, { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' }]}> 
            <View style={[styles.guestIconContainer, { backgroundColor: colors.tint + '20' }]}> 
              <Ionicons name="person-circle-outline" size={48} color={colors.tint} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>Sign In Required</Text>
            <Text style={[styles.guestSubtitle, { color: colors.icon }]}>Create an account or sign in to manage your profile.</Text>
            <Button title="Sign In" onPress={() => router.push('/login')} style={styles.signInButton} />
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={[styles.signUpLink, { color: colors.tint }]}>Don't have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.avatarLarge, { backgroundColor: colors.tint + '20', borderColor: colors.tint + '55' }]}
            onPress={openAvatarActions}
            activeOpacity={0.8}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarInitials, { color: colors.tint }]}>{avatarInitials}</Text>
            )}
            <View style={[styles.avatarBadge, { backgroundColor: colors.background }]}> 
              <Ionicons name="camera-outline" size={14} color={colors.tint} />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.icon }]}>Tap to update or remove picture</Text>
          <Text style={[styles.name, { color: colors.text }]}>{profileData?.username || 'User'}</Text>
          <Text style={[styles.email, { color: colors.icon }]}>{profileData?.email || ''}</Text>
        </View>

        <Formik
          enableReinitialize
          initialValues={{
            name: profileData?.username || '',
            email: profileData?.email || '',
            phone: profileData?.phone || '',
            date_of_birth: profileData?.date_of_birth || '',
            gender: profileData?.gender || '',
          }}
          validationSchema={profileSchema}
          onSubmit={handleSaveProfile}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            resetForm,
            setFieldValue,
          }) => {
            const onDobChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
              if (Platform.OS === 'android') {
                setShowDobPicker(false);
              }
              if (event.type === 'set' && selectedDate) {
                const isoDate = selectedDate.toISOString().split('T')[0];
                setFieldValue('date_of_birth', isoDate);
              }
            };

            const openDobPicker = () => {
              const currentDate = values.date_of_birth
                ? new Date(values.date_of_birth)
                : new Date(2000, 0, 1);

              if (Platform.OS === 'android') {
                DateTimePickerAndroid.open({
                  value: currentDate,
                  mode: 'date',
                  maximumDate: new Date(),
                  onChange: onDobChange,
                });
                return;
              }

              setShowDobPicker(true);
            };

            return (
              <>
                <Card>
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>Personal Information</Text>
                    {!isEditing && (
                      <TouchableOpacity onPress={() => setIsEditing(true)}>
                        <Ionicons name="pencil" size={20} color={colors.tint} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {isEditing ? (
                    <>
                      <Input
                        label="Full Name"
                        placeholder="Enter your name"
                        value={values.name}
                        onChangeText={handleChange('name')}
                        onBlur={handleBlur('name')}
                        error={errors.name}
                        touched={touched.name}
                        icon="person-outline"
                      />

                      <Input
                        label="Email"
                        placeholder="Enter your email"
                        value={values.email}
                        editable={false}
                        icon="mail-outline"
                      />

                      <Input
                        label="Phone"
                        placeholder="Enter your phone number"
                        value={values.phone}
                        onChangeText={handleChange('phone')}
                        onBlur={handleBlur('phone')}
                        error={errors.phone}
                        touched={touched.phone}
                        keyboardType="phone-pad"
                        icon="call-outline"
                      />

                      <Text style={[styles.label, { color: colors.text }]}>Date of Birth</Text>
                      <TouchableOpacity
                        style={[
                          styles.dateField,
                          { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#F5F5F5' },
                        ]}
                        onPress={openDobPicker}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="calendar-outline" size={20} color={colors.icon} style={styles.dateIcon} />
                        <Text style={[styles.dateFieldText, { color: values.date_of_birth ? colors.text : colors.icon }]}>
                          {formatDob(values.date_of_birth)}
                        </Text>
                      </TouchableOpacity>
                      {touched.date_of_birth && errors.date_of_birth ? (
                        <Text style={styles.errorText}>{errors.date_of_birth}</Text>
                      ) : null}

                      {showDobPicker && (
                        <DateTimePicker
                          value={values.date_of_birth ? new Date(values.date_of_birth) : new Date(2000, 0, 1)}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          maximumDate={new Date()}
                          onChange={onDobChange}
                        />
                      )}
                      {showDobPicker && Platform.OS === 'ios' && (
                        <View style={styles.iosPickerActions}>
                          <Button title="Done" size="small" onPress={() => setShowDobPicker(false)} />
                        </View>
                      )}

                      <Text style={[styles.dobHint, { color: colors.icon }]}>Age is calculated automatically from date of birth.</Text>

                      <InfoItem
                        label="Calculated Age"
                        value={calculateAgeBreakdown(values.date_of_birth) || 'N/A'}
                        icon="time-outline"
                      />

                      <View style={styles.genderContainer}>
                        <Text style={[styles.label, { color: colors.text }]}>Gender</Text>
                        <View style={styles.genderButtons}>
                          {['male', 'female', 'other'].map((g) => (
                            <TouchableOpacity
                              key={g}
                              style={[
                                styles.genderButton,
                                {
                                  backgroundColor:
                                    values.gender === g
                                      ? colors.tint
                                      : theme === 'dark'
                                        ? '#2A2A2A'
                                        : '#F5F5F5',
                                },
                              ]}
                              onPress={() => handleChange('gender')(g)}
                            >
                              <Text style={[styles.genderText, { color: values.gender === g ? '#fff' : colors.text }]}> 
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    </>
                  ) : (
                    <View style={styles.infoRow}>
                      <InfoItem label="Phone" value={renderValue(profileData?.phone)} icon="call-outline" />
                      <InfoItem label="Date of Birth" value={renderValue(profileData?.date_of_birth)} icon="calendar-outline" />
                      {profileData?.date_of_birth ? (
                        <InfoItem label="Age" value={calculateAgeBreakdown(profileData?.date_of_birth) || 'N/A'} icon="time-outline" />
                      ) : null}
                      <InfoItem
                        label="Gender"
                        value={renderValue(profileData?.gender)}
                        icon={genderIcon(profileData?.gender)}
                      />
                    </View>
                  )}
                </Card>

                {isEditing && (
                  <View style={styles.actionButtons}>
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => {
                        setIsEditing(false);
                        setShowDobPicker(false);
                        resetForm();
                      }}
                      style={styles.cancelButton}
                    />
                    <Button
                      title="Save Changes"
                      onPress={handleSubmit as any}
                      loading={isLoading}
                      style={styles.saveButton}
                    />
                  </View>
                )}
              </>
            );
          }}
        </Formik>
      </ScrollView>

      <LoadingSpinner visible={isLoading} message="Updating profile..." />
    </KeyboardAvoidingView>
  );
}

const InfoItem = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <View style={styles.infoItem}>
      <View style={styles.infoHeader}>
        <Ionicons name={icon} size={16} color={colors.icon} />
        <Text style={[styles.infoLabel, { color: colors.icon }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60, paddingBottom: 48 },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarLarge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 12,
    marginBottom: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 50,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  dateIcon: {
    marginRight: 12,
  },
  dateFieldText: {
    fontSize: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  iosPickerActions: {
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  dobHint: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 12,
  },
  genderContainer: {
    marginBottom: 16,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    gap: 16,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  guestOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  guestContent: {
    width: '100%',
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  guestIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  signInButton: {
    width: '100%',
    marginBottom: 16,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
