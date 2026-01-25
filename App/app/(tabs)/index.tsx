// Home/Dashboard Screen

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ResultCard } from '@/components/ResultCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { api } from '@/src/services/api';
import { storage } from '@/src/utils/storage';
import { APP_CONFIG } from '@/src/utils/constants';
import type { Scan, PredictionResult } from '@/src/types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [lastScan, setLastScan] = useState<Scan | null>(null);

  useEffect(() => {
    loadLastScan();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Please grant camera and gallery permissions to upload X-rays.'
      );
    }
  };

  const loadLastScan = async () => {
    try {
      const history = await api.getHistory();
      if (history.length > 0) {
        setLastScan(history[0]);
      }
    } catch (error) {
      console.error('Error loading last scan:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadLastScan();
    setIsRefreshing(false);
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Check file size
        const fileInfo = await fetch(imageUri);
        const blob = await fileInfo.blob();

        if (blob.size > APP_CONFIG.MAX_IMAGE_SIZE) {
          Alert.alert(
            'File Too Large',
            'Please select an image smaller than 10MB'
          );
          return;
        }

        setSelectedImage(imageUri);
        analyzeImage(imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const analyzeImage = async (imageUri: string) => {
    setIsAnalyzing(true);
    setPrediction(null);

    try {
      const result = await api.uploadAndPredict(imageUri);
      setPrediction(result);

      // Update last scan
      await loadLastScan();

      // Cache the result
      const cachedScans = await storage.getCachedScans();
      await storage.setCachedScans([
        {
          id: result.scanId,
          userId: user?.id || '',
          imageUrl: imageUri,
          result: result.result,
          confidence: result.confidence,
          timestamp: result.timestamp,
        },
        ...cachedScans.slice(0, APP_CONFIG.CACHE_LIMIT - 1),
      ]);

      // Show result
      Alert.alert(
        'Analysis Complete',
        `Result: ${result.result}\nConfidence: ${result.confidence.toFixed(1)}%`,
        [
          {
            text: 'View Details',
            onPress: () => router.push('/(tabs)/history'),
          },
          { text: 'OK' },
        ]
      );
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      Alert.alert('Analysis Failed', error.message || 'Please try again');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const showImageSourceOptions = () => {
    Alert.alert(
      'Upload X-ray',
      'Choose image source',
      [
        {
          text: 'Camera',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Gallery',
          onPress: () => pickImage('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.tint}
          />
        }
      >
        {/* Guest Login Banner */}
        {isGuest && (
          <TouchableOpacity
            style={[styles.guestBanner, { backgroundColor: colors.tint + '15' }]}
            onPress={() => router.push('/login')}
          >
            <Ionicons name="person-add-outline" size={20} color={colors.tint} />
            <Text style={[styles.guestBannerText, { color: colors.tint }]}>
              Sign in to save your scan history
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.tint} />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.icon }]}>
              {isGuest ? 'Welcome,' : 'Welcome back,'}
            </Text>
            <Text style={[styles.userName, { color: colors.text }]}>
              {isGuest ? 'Guest User' : (user?.name || 'User')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => isGuest ? router.push('/login') : router.push('/(tabs)/profile')}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.tint + '20' },
              ]}
            >
              <Ionicons name={isGuest ? 'log-in-outline' : 'person'} size={24} color={colors.tint} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Upload Section */}
        <Card style={styles.uploadCard}>
          <View style={styles.uploadIcon}>
            <Ionicons name="cloud-upload-outline" size={48} color={colors.tint} />
          </View>
          <Text style={[styles.uploadTitle, { color: colors.text }]}>
            Upload Chest X-ray
          </Text>
          <Text style={[styles.uploadSubtitle, { color: colors.icon }]}>
            Get instant AI-powered diagnosis for TB and Pneumonia
          </Text>
          <Button
            title="Upload X-ray"
            onPress={showImageSourceOptions}
            style={styles.uploadButton}
            disabled={isAnalyzing}
          />
        </Card>

        {/* Last Scan */}
        {lastScan && !isGuest && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Last Scan
              </Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={[styles.viewAll, { color: colors.tint }]}>
                  View All
                </Text>
              </TouchableOpacity>
            </View>
            <ResultCard
              result={lastScan.result}
              confidence={lastScan.confidence}
              timestamp={lastScan.timestamp}
              imageUrl={lastScan.imageUrl}
              onPress={() => router.push('/(tabs)/history')}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' },
                isGuest && styles.disabledCard,
              ]}
              onPress={() => isGuest ? router.push('/login') : router.push('/(tabs)/history')}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: '#51CF66' + '20' },
                ]}
              >
                <Ionicons name="time-outline" size={24} color={isGuest ? '#51CF6680' : '#51CF66'} />
              </View>
              <Text style={[styles.actionText, { color: isGuest ? colors.icon : colors.text }]}>
                History
              </Text>
              {isGuest && <Ionicons name="lock-closed" size={12} color={colors.icon} style={styles.lockIcon} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' },
                isGuest && styles.disabledCard,
              ]}
              onPress={() => isGuest ? router.push('/login') : router.push('/(tabs)/profile')}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: '#4C6EF5' + '20' },
                ]}
              >
                <Ionicons name="document-text-outline" size={24} color={isGuest ? '#4C6EF580' : '#4C6EF5'} />
              </View>
              <Text style={[styles.actionText, { color: isGuest ? colors.icon : colors.text }]}>
                Reports
              </Text>
              {isGuest && <Ionicons name="lock-closed" size={12} color={colors.icon} style={styles.lockIcon} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' },
              ]}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: '#FFA94D' + '20' },
                ]}
              >
                <Ionicons name="settings-outline" size={24} color="#FFA94D" />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>
                Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <LoadingSpinner
        visible={isAnalyzing}
        message="Analyzing X-ray..."
      />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
  uploadCard: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  uploadIcon: {
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  uploadButton: {
    minWidth: 200,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  viewAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  disabledCard: {
    opacity: 0.6,
  },
  lockIcon: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});
