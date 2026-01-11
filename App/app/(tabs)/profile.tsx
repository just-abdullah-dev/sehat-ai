// Profile Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Formik } from 'formik';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { api } from '@/src/services/api';
import { profileSchema } from '@/src/utils/validation';
import type { User } from '@/src/types';

export default function ProfileScreen() {
  const { user, updateUser } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<User | null>(user);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await api.getProfile();
      setProfileData(profile);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleSaveProfile = async (values: any) => {
    setIsLoading(true);
    try {
      const updatedProfile = await api.updateProfile(values);
      await updateUser(updatedProfile);
      setProfileData(updatedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const renderValue = (value: any) => {
    return value || 'Not provided';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.avatarLarge, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="person" size={48} color={colors.tint} />
          </View>
          <Text style={[styles.name, { color: colors.text }]}>
            {profileData?.name || 'User'}
          </Text>
          <Text style={[styles.email, { color: colors.icon }]}>
            {profileData?.email || ''}
          </Text>
        </View>

        <Formik
          enableReinitialize
          initialValues={{
            name: profileData?.name || '',
            email: profileData?.email || '',
            phone: profileData?.phone || '',
            age: profileData?.age?.toString() || '',
            gender: profileData?.gender || '',
            symptoms: profileData?.symptoms || '',
            medicines: profileData?.medicines?.join(', ') || '',
          }}
          validationSchema={profileSchema}
          onSubmit={(values) => {
            const submittedValues = {
              ...values,
              age: values.age ? parseInt(values.age) : undefined,
              medicines: values.medicines
                ? values.medicines.split(',').map((m) => m.trim())
                : [],
            };
            handleSaveProfile(submittedValues);
          }}
        >
          {({
            handleChange,
            handleBlur,
            handleSubmit,
            values,
            errors,
            touched,
            resetForm,
          }) => (
            <>
              {/* Personal Information */}
              <Card>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    Personal Information
                  </Text>
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
                      onChangeText={handleChange('email')}
                      onBlur={handleBlur('email')}
                      error={errors.email}
                      touched={touched.email}
                      keyboardType="email-address"
                      autoCapitalize="none"
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

                    <Input
                      label="Age"
                      placeholder="Enter your age"
                      value={values.age}
                      onChangeText={handleChange('age')}
                      onBlur={handleBlur('age')}
                      error={errors.age}
                      touched={touched.age}
                      keyboardType="number-pad"
                      icon="calendar-outline"
                    />

                    <View style={styles.genderContainer}>
                      <Text style={[styles.label, { color: colors.text }]}>
                        Gender
                      </Text>
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
                            <Text
                              style={[
                                styles.genderText,
                                {
                                  color:
                                    values.gender === g
                                      ? '#fff'
                                      : colors.text,
                                },
                              ]}
                            >
                              {g.charAt(0).toUpperCase() + g.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                ) : (
                  <View style={styles.infoRow}>
                    <InfoItem
                      label="Phone"
                      value={renderValue(profileData?.phone)}
                      icon="call-outline"
                    />
                    <InfoItem
                      label="Age"
                      value={renderValue(profileData?.age)}
                      icon="calendar-outline"
                    />
                    <InfoItem
                      label="Gender"
                      value={renderValue(profileData?.gender)}
                      icon="person-outline"
                    />
                  </View>
                )}
              </Card>

              {/* Medical Information */}
              <Card>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  Medical Information
                </Text>

                {isEditing ? (
                  <>
                    <Input
                      label="Symptoms"
                      placeholder="Describe your symptoms"
                      value={values.symptoms}
                      onChangeText={handleChange('symptoms')}
                      onBlur={handleBlur('symptoms')}
                      multiline
                      numberOfLines={3}
                      style={{ height: 80 }}
                      icon="fitness-outline"
                    />

                    <Input
                      label="Medicines"
                      placeholder="Enter medicines (comma separated)"
                      value={values.medicines}
                      onChangeText={handleChange('medicines')}
                      onBlur={handleBlur('medicines')}
                      icon="medical-outline"
                    />
                  </>
                ) : (
                  <>
                    <InfoItem
                      label="Symptoms"
                      value={renderValue(profileData?.symptoms)}
                      icon="fitness-outline"
                      fullWidth
                    />
                    <InfoItem
                      label="Medicines"
                      value={
                        profileData?.medicines?.join(', ') || 'Not provided'
                      }
                      icon="medical-outline"
                      fullWidth
                    />
                  </>
                )}
              </Card>

              {/* Action Buttons */}
              {isEditing && (
                <View style={styles.actionButtons}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => {
                      setIsEditing(false);
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
          )}
        </Formik>
      </ScrollView>

      <LoadingSpinner visible={isLoading} message="Updating profile..." />
    </View>
  );
}

// Info Item Component
const InfoItem = ({
  label,
  value,
  icon,
  fullWidth = false,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <View style={[styles.infoItem, fullWidth && styles.infoItemFull]}>
      <View style={styles.infoHeader}>
        <Ionicons name={icon} size={16} color={colors.icon} />
        <Text style={[styles.infoLabel, { color: colors.icon }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
};

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
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  infoItemFull: {
    width: '100%',
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
});
