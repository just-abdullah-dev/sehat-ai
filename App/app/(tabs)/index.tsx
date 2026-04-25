// Home/Dashboard Screen — Full Prediction Flow

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/src/context/AuthContext';
import { useLanguage } from '@/src/hooks/useLanguage';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { GradCAMReportCard } from '@/components/GradCAMReportCard';
import { predictionApi, historyApi } from '@/src/services/api';
import { APP_CONFIG, API_CONFIG } from '@/src/utils/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  DetailedPneumoniaPrediction,
  DiseaseSelection,
  PredictionResponse,
  ScanHistoryItem,
} from '@/src/types';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { user, isGuest, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const rowDirection = isRTL ? 'row-reverse' : 'row';
  const textAlign = isRTL ? 'right' : 'left';

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [diseaseSelection, setDiseaseSelection] = useState<DiseaseSelection>('both');
  const [analyzingModel, setAnalyzingModel] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const scrollRef = React.useRef<ScrollView>(null);
  const [resultsY, setResultsY] = useState<number>(0);
  const scanAnim = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(0)).current;
  const avatarStorageKey = React.useMemo(() => `@sehatai_avatar_${user?.id ?? 'guest'}`, [user?.id]);

  // Results from the last analysis
  const [tbResult, setTbResult] = useState<PredictionResponse | null>(null);
  const [pneumoniaResult, setPneumoniaResult] = useState<PredictionResponse | null>(null);
  const [pneumoniaDetailedResult, setPneumoniaDetailedResult] =
    useState<DetailedPneumoniaPrediction | null>(null);
  const [isLoadingDetailed, setIsLoadingDetailed] = useState(false);

  // Last scan from history (authenticated users only)
  const [lastScan, setLastScan] = useState<ScanHistoryItem | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadLastScan();
    }
    requestPermissions();
  }, [isAuthenticated]);

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

  useEffect(() => {
    if (!isAnalyzing || !selectedImage) {
      scanAnim.stopAnimation();
      scanAnim.setValue(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
      return;
    }

    const scanLoop = Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      })
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    scanLoop.start();
    pulseLoop.start();

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
    };
  }, [isAnalyzing, selectedImage, scanAnim, pulseAnim]);

  useEffect(() => {
    const hasResults = tbResult !== null || pneumoniaResult !== null;
    if (!hasResults || isAnalyzing) return;

    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(resultsY - 20, 0), animated: true });
    }, 160);

    return () => clearTimeout(t);
  }, [tbResult, pneumoniaResult, isAnalyzing, resultsY]);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: galleryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (cameraStatus !== 'granted' || galleryStatus !== 'granted') {
      Alert.alert(
        t('common.error'),
        t('home.uploadSubtitle')
      );
    }
  };

  const loadLastScan = async () => {
    try {
      const response = await historyApi.getHistory(undefined, 1, 0);
      if (response.scans.length > 0) {
        setLastScan(response.scans[0]);
      }
    } catch {
      // Silently fail — history is not critical for home screen
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    if (isAuthenticated) await loadLastScan();
    setIsRefreshing(false);
  }, [isAuthenticated]);

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          // aspect: [3, 4],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          // aspect: [3, 4],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const fileInfo = await fetch(imageUri);
        const blob = await fileInfo.blob();
        if (blob.size > APP_CONFIG.MAX_IMAGE_SIZE) {
          Alert.alert(t('common.error'), 'Please select an image smaller than 10MB');
          return;
        }
        setSelectedImage(imageUri);
        // Reset previous results
        setTbResult(null);
        setPneumoniaResult(null);
        setPneumoniaDetailedResult(null);
      }
    } catch {
      Alert.alert(t('common.error'), 'Failed to pick image. Please try again.');
    }
  };

  const showImageSourceOptions = () => {
    // If user explicitly wants to change image, clear previous analysis state immediately.
    if (selectedImage) {
      setTbResult(null);
      setPneumoniaResult(null);
      setAnalysisError(null);
      setPneumoniaDetailedResult(null);
    }

    Alert.alert(t('home.uploadTitle'), 'Choose image source', [
      { text: 'Camera', onPress: () => pickImage('camera') },
      { text: 'Gallery', onPress: () => pickImage('gallery') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const analyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert(t('common.error'), 'Please select an X-ray image first.');
      return;
    }

    setIsAnalyzing(true);
    setTbResult(null);
    setPneumoniaResult(null);
    setPneumoniaDetailedResult(null);
    setAnalysisError(null);

    try {
      if (diseaseSelection === 'both') {
        // setAnalyzingModel('Running TB & Pneumonia analysis...');
        const { tb, pneumonia } = await predictionApi.predictBoth(selectedImage);
        setTbResult(tb ?? null);
        setPneumoniaResult(pneumonia ?? null);
        if (!tb && !pneumonia) {
          setAnalysisError('Both predictions failed. Please try again.');
          Alert.alert(t('common.error'), 'Both predictions failed. Please try again.');
        }
      } else if (diseaseSelection === 'tb') {
        // setAnalyzingModel('Running TB analysis...');
        const result = await predictionApi.predict(selectedImage, 'tb');
        setTbResult(result);
      } else {
        // setAnalyzingModel('Running Pneumonia analysis...');
        const result = await predictionApi.predict(selectedImage, 'pneumonia');
        setPneumoniaResult(result);
      }

      // Reload last scan if authenticated (results saved to DB)
      if (isAuthenticated) {
        await loadLastScan();
      }
    } catch (err: unknown) {
      const error = err as Error;
      setAnalysisError(error.message || 'Prediction failed. Please try again.');
      Alert.alert(t('common.error'), error.message || 'Please try again.');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingModel('');
    }
  };

  const loadDetailedPneumonia = async () => {
    if (!selectedImage) {
      return;
    }
    setIsLoadingDetailed(true);
    setPneumoniaDetailedResult(null);
    try {
      const detailed = await predictionApi.predictPneumoniaDetailed(selectedImage);
      setPneumoniaDetailedResult(detailed);
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert(t('common.error'), error.message || 'Detailed analysis failed. Please try again.');
    } finally {
      setIsLoadingDetailed(false);
    }
  };

  const openReport = (scanId: number) => {
    router.push(`/modal?scanId=${scanId}`);
  };

  const getResultColor = (result: 'Positive' | 'Normal') =>
    result === 'Positive' ? '#FF6B6B' : '#51CF66';

  const getResultIcon = (result: 'Positive' | 'Normal') =>
    result === 'Positive' ? 'alert-circle' : 'checkmark-circle';

  const hasResults = tbResult !== null || pneumoniaResult !== null;
  const showSelection = selectedImage && !hasResults;
  const scanLineTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 240],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Guest Banner */}
        {isGuest && (
          <TouchableOpacity
            style={[styles.guestBanner, { backgroundColor: colors.tint + '15', flexDirection: rowDirection }]}
            onPress={() => router.push('/login')}
          >
            <Ionicons name="person-add-outline" size={20} color={colors.tint} />
            <Text style={[styles.guestBannerText, { color: colors.tint, textAlign }]}>
              {t('home.guestBanner')}
            </Text>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.tint} />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={[styles.header, { flexDirection: rowDirection }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.icon, textAlign }]}>
              {isGuest ? t('home.welcome') : t('home.welcomeBack')}
            </Text>
            <Text style={[styles.userName, { color: colors.text, textAlign }]}>
              {isGuest ? t('home.guestUser') : (user?.username || 'User')}
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

        {/* ─── Upload Card ───────────────────────────────────── */}
        <Card style={styles.uploadCard}>
          <View style={styles.uploadIcon}>
            <Ionicons name="cloud-upload-outline" size={48} color={colors.tint} />
          </View>
          <Text style={[styles.uploadTitle, { color: colors.text }]}>
            {t('home.uploadTitle')}
          </Text>
          <Text style={[styles.uploadSubtitle, { color: colors.icon }]}>
            {t('home.uploadSubtitle')}
          </Text>

          {/* Selected image preview */}
          {selectedImage && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.previewImage} />
              {isAnalyzing && (
                <View style={styles.animationOverlay}>
                  {/* Grid lines for high-tech look */}
                  <View style={styles.gridOverlay}>
                    <View style={[styles.gridLine, { top: '25%', backgroundColor: colors.tint + '15' }]} />
                    <View style={[styles.gridLine, { top: '50%', backgroundColor: colors.tint + '15' }]} />
                    <View style={[styles.gridLine, { top: '75%', backgroundColor: colors.tint + '15' }]} />
                    <View style={[styles.gridLineV, { left: '33%', backgroundColor: colors.tint + '15' }]} />
                    <View style={[styles.gridLineV, { left: '66%', backgroundColor: colors.tint + '15' }]} />
                  </View>

                  {/* Corner Brackets */}
                  <View style={[styles.corner, styles.cornerTL, { borderColor: colors.tint }]} />
                  <View style={[styles.corner, styles.cornerTR, { borderColor: colors.tint }]} />
                  <View style={[styles.corner, styles.cornerBL, { borderColor: colors.tint }]} />
                  <View style={[styles.corner, styles.cornerBR, { borderColor: colors.tint }]} />

                  {/* Target Center */}
                  <Animated.View style={[styles.targetBox, { opacity: pulseAnim, borderColor: colors.tint }]}>
                    <View style={[styles.targetInner, { backgroundColor: colors.tint }]} />
                  </Animated.View>

                  {/* Scanning Beam */}
                  <Animated.View
                    style={[
                      styles.scanBeam,
                      {
                        transform: [{ translateY: scanLineTranslate }],
                      },
                    ]}
                  >
                    <View style={[styles.scanLineInner, { backgroundColor: colors.tint }]} />
                    <View style={[styles.scanGlow, { backgroundColor: colors.tint + '30' }]} />
                  </Animated.View>

                  <View style={styles.scanMaskImproved}>
                    <Text style={[styles.scanLabelImproved, { color: colors.tint }]}>
                      SYSTEM ANALYSIS IN PROGRESS
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <Button
            title={selectedImage ? t('home.changeImage') : t('home.selectImage')}
            variant={selectedImage ? 'outline' : 'primary'}
            onPress={showImageSourceOptions}
            style={styles.uploadButton}
            disabled={isAnalyzing}
          />
        </Card>

        {/* ─── Disease Selection ─────────────────────────────── */}
        {showSelection && (
          <Card style={styles.selectionCard}>
            <Text style={[styles.selectionTitle, { color: colors.text }]}>
              {t('home.selectionTitle')}
            </Text>
            <View style={styles.selectionRow}>
              {(['both', 'tb', 'pneumonia'] as DiseaseSelection[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.selectionChip,
                    {
                      backgroundColor:
                        diseaseSelection === option ? colors.tint : colors.tint + '15',
                      borderColor: colors.tint,
                    },
                  ]}
                  onPress={() => setDiseaseSelection(option)}
                >
                  <Text
                    style={[
                      styles.selectionChipText,
                      { color: diseaseSelection === option ? '#fff' : colors.tint },
                    ]}
                  >
                    {option === 'both' ? t('home.both') : option === 'tb' ? t('home.tbOnly') : t('home.pneumoniaOnly')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {analysisError ? (
              <View style={[styles.errorCard, { backgroundColor: colors.tint + '14' }]}>
                <Text style={[styles.errorText, { color: colors.text }]}>{analysisError}</Text>
                <Button
                  title={t('home.rerun')}
                  size="small"
                  variant="outline"
                  onPress={analyzeImage}
                  loading={isAnalyzing}
                  style={styles.rerunButton}
                />
              </View>
            ) : (
              <Button
                title={t('home.analyze')}
                onPress={analyzeImage}
                loading={isAnalyzing}
                style={styles.analyzeButton}
              />
            )}
          </Card>
        )}

        {isAnalyzing && selectedImage && (
          <Card style={styles.loadingCard}>
            <Text style={[styles.loadingTitle, { color: colors.text }]}>{analyzingModel || 'Scanning image...'}</Text>
            <View style={[styles.skeletonBarLg, { backgroundColor: colors.icon + '35' }]} />
            <View style={[styles.skeletonBarMd, { backgroundColor: colors.icon + '25' }]} />
            <View style={[styles.skeletonBarSm, { backgroundColor: colors.icon + '20' }]} />
          </Card>
        )}

        {/* ─── Analysis Results ──────────────────────────────── */}
        {hasResults && (
          <View
            style={styles.section}
            onLayout={(e) => setResultsY(e.nativeEvent.layout.y)}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.analysisResults')}</Text>

            {/* TB Result */}
            {tbResult && (
              <Card style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={[styles.resultBadge, { backgroundColor: colors.tint + '20' }]}>
                    <Ionicons name="medical" size={16} color={colors.tint} />
                    <Text style={[styles.resultBadgeText, { color: colors.tint }]}>
                      Tuberculosis (TB)
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.resultStatus,
                      { backgroundColor: getResultColor(tbResult.result) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getResultIcon(tbResult.result)}
                      size={16}
                      color={getResultColor(tbResult.result)}
                    />
                    <Text
                      style={[
                        styles.resultStatusText,
                        { color: getResultColor(tbResult.result) },
                      ]}
                    >
                      {tbResult.result}
                    </Text>
                  </View>
                </View>

                <View style={styles.resultDetails}>
                  <View style={styles.confidenceBar}>
                    <Text style={[styles.confidenceLabel, { color: colors.icon }]}>
                      Confidence
                    </Text>
                    <Text style={[styles.confidenceValue, { color: colors.text }]}>
                      {(tbResult.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View
                    style={[styles.progressTrack, { backgroundColor: colors.icon + '30' }]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${tbResult.confidence * 100}%` as `${number}%`,
                          backgroundColor: getResultColor(tbResult.result),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.processingTime, { color: colors.icon }]}>
                    Processing time: {tbResult.processing_time?.toFixed(2) ?? '—'}s
                  </Text>
                  <Text style={[styles.resultMessage, { color: colors.icon }]}>
                    {tbResult.message}
                  </Text>
                  
                  {/* Save Status Indicator */}
                  {isAuthenticated && (
                    <View style={[styles.saveStatus, { backgroundColor: colors.tint + '10', borderColor: tbResult.scan_id != null ? '#51CF66' : '#FF6B6B' }]}>
                      <Ionicons
                        name={tbResult.scan_id != null ? 'checkmark-circle' : 'alert-circle'}
                        size={16}
                        color={tbResult.scan_id != null ? '#51CF66' : '#FF6B6B'}
                      />
                      <Text style={[styles.saveStatusText, { color: tbResult.scan_id != null ? '#51CF66' : '#FF6B6B' }]}>
                          {tbResult.scan_id != null ? t('home.savedToHistory') : t('home.notSavedToHistory')}
                      </Text>
                    </View>
                  )}
                </View>

                {isAuthenticated && tbResult.scan_id != null && (
                  <Button
                    title="Download TB Report"
                    variant="outline"
                    size="small"
                    onPress={() => openReport(tbResult.scan_id!)}
                    style={styles.reportButton}
                  />
                )}
                {(isGuest || tbResult.scan_id == null) && (
                  <TouchableOpacity
                    style={styles.loginPrompt}
                    onPress={() => router.push('/login')}
                  >
                    <Ionicons name="lock-closed-outline" size={14} color={colors.icon} />
                    <Text style={[styles.loginPromptText, { color: colors.icon }]}>
                      {t('home.signInForReport')}
                    </Text>
                  </TouchableOpacity>
                )}
              </Card>
            )}

            {/* Pneumonia Result */}
            {pneumoniaResult && (
              <Card style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={[styles.resultBadge, { backgroundColor: colors.tint + '20' }]}>
                    <Ionicons name="medical" size={16} color={colors.tint} />
                    <Text style={[styles.resultBadgeText, { color: colors.tint }]}>
                      Pneumonia
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.resultStatus,
                      { backgroundColor: getResultColor(pneumoniaResult.result) + '20' },
                    ]}
                  >
                    <Ionicons
                      name={getResultIcon(pneumoniaResult.result)}
                      size={16}
                      color={getResultColor(pneumoniaResult.result)}
                    />
                    <Text
                      style={[
                        styles.resultStatusText,
                        { color: getResultColor(pneumoniaResult.result) },
                      ]}
                    >
                      {pneumoniaResult.result}
                    </Text>
                  </View>
                </View>

                <View style={styles.resultDetails}>
                  <View style={styles.confidenceBar}>
                    <Text style={[styles.confidenceLabel, { color: colors.icon }]}>
                      Confidence
                    </Text>
                    <Text style={[styles.confidenceValue, { color: colors.text }]}>
                      {(pneumoniaResult.confidence * 100).toFixed(1)}%
                    </Text>
                  </View>
                  <View
                    style={[styles.progressTrack, { backgroundColor: colors.icon + '30' }]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${pneumoniaResult.confidence * 100}%` as `${number}%`,
                          backgroundColor: getResultColor(pneumoniaResult.result),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.processingTime, { color: colors.icon }]}>
                    Processing time: {pneumoniaResult.processing_time?.toFixed(2) ?? '—'}s
                  </Text>
                  <Text style={[styles.resultMessage, { color: colors.icon }]}>
                    {pneumoniaResult.message}
                  </Text>
                  
                  {/* Save Status Indicator */}
                  {isAuthenticated && (
                    <View style={[styles.saveStatus, { backgroundColor: colors.tint + '10', borderColor: pneumoniaResult.scan_id != null ? '#51CF66' : '#FF6B6B' }]}>
                      <Ionicons
                        name={pneumoniaResult.scan_id != null ? 'checkmark-circle' : 'alert-circle'}
                        size={16}
                        color={pneumoniaResult.scan_id != null ? '#51CF66' : '#FF6B6B'}
                      />
                      <Text style={[styles.saveStatusText, { color: pneumoniaResult.scan_id != null ? '#51CF66' : '#FF6B6B' }]}>
                          {pneumoniaResult.scan_id != null ? t('home.savedToHistory') : t('home.notSavedToHistory')}
                      </Text>
                    </View>
                  )}
                </View>

                {isAuthenticated && pneumoniaResult.scan_id != null && (
                  <Button
                    title="Download Pneumonia Report"
                    variant="outline"
                    size="small"
                    onPress={() => openReport(pneumoniaResult.scan_id!)}
                    style={styles.reportButton}
                  />
                )}
                {(isGuest || pneumoniaResult.scan_id == null) && (
                  <TouchableOpacity
                    style={styles.loginPrompt}
                    onPress={() => router.push('/login')}
                  >
                    <Ionicons name="lock-closed-outline" size={14} color={colors.icon} />
                    <Text style={[styles.loginPromptText, { color: colors.icon }]}>
                      {t('home.signInForReport')}
                    </Text>
                  </TouchableOpacity>
                )}

                <Button
                  title={isLoadingDetailed ? 'Generating Analysis...' : '🔬 View Detailed Grad-CAM Analysis'}
                  variant="outline"
                  size="small"
                  loading={isLoadingDetailed}
                  disabled={isLoadingDetailed}
                  onPress={loadDetailedPneumonia}
                  style={{ marginTop: 10 }}
                />

                {pneumoniaDetailedResult && (
                  <GradCAMReportCard
                    report={pneumoniaDetailedResult}
                    onExportPDF={
                      isAuthenticated && pneumoniaDetailedResult.scan_id != null
                        ? () => openReport(pneumoniaDetailedResult.scan_id!)
                        : undefined
                    }
                  />
                )}
              </Card>
            )}

            {/* Download Both (when both results are available and authenticated) */}
            {isAuthenticated && tbResult?.scan_id != null && pneumoniaResult?.scan_id != null && (
              <View style={styles.bothReportsRow}>
                <Button
                  title="Download Both Reports"
                  variant="secondary"
                  onPress={() => {
                    openReport(tbResult.scan_id!);
                    setTimeout(() => openReport(pneumoniaResult.scan_id!), 500);
                  }}
                />
              </View>
            )}
          </View>
        )}

        {/* ─── Last Scan (authenticated users) ──────────────── */}
        {lastScan && isAuthenticated && !hasResults && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.lastScan')}</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={[styles.viewAll, { color: colors.tint }]}>{t('home.viewAll')}</Text>
              </TouchableOpacity>
            </View>
            <Card style={styles.lastScanCard}>
              <View style={styles.lastScanRow}>
                {lastScan.file_url && (
                  <Image
                    source={{ uri: `${API_CONFIG.BASE_URL}${lastScan.file_url}` }}
                    style={styles.lastScanImage}
                  />
                )}
                <View style={styles.lastScanInfo}>
                  <View style={styles.lastScanBadgeRow}>
                    <Text
                      style={[
                        styles.lastScanModel,
                        { color: colors.tint },
                      ]}
                    >
                      {lastScan.model_used.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.lastScanResult,
                        { color: getResultColor(lastScan.result) },
                      ]}
                    >
                      {lastScan.result}
                    </Text>
                  </View>
                  <Text style={[styles.lastScanConfidence, { color: colors.text }]}>
                    {(lastScan.confidence * 100).toFixed(1)}% confidence
                  </Text>
                  <Text style={[styles.lastScanDate, { color: colors.icon }]}>
                    {new Date(lastScan.created_at).toLocaleDateString()}
                  </Text>
                </View>
                {lastScan.id && (
                  <TouchableOpacity onPress={() => openReport(lastScan.id)}>
                    <Ionicons name="document-text-outline" size={24} color={colors.tint} />
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          </View>
        )}

        {/* ─── Quick Actions ─────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.quickActions')}</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' },
                isGuest && styles.disabledCard,
              ]}
              onPress={() => isGuest ? router.push('/login') : router.push('/(tabs)/history')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#51CF6620' }]}>
                <Ionicons name="time-outline" size={24} color={isGuest ? '#51CF6660' : '#51CF66'} />
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
              <View style={[styles.actionIcon, { backgroundColor: '#4C6EF520' }]}>
                <Ionicons name="person-outline" size={24} color={isGuest ? '#4C6EF560' : '#4C6EF5'} />
              </View>
              <Text style={[styles.actionText, { color: isGuest ? colors.icon : colors.text }]}>
                Profile
              </Text>
              {isGuest && <Ionicons name="lock-closed" size={12} color={colors.icon} style={styles.lockIcon} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' }]}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FFA94D20' }]}>
                <Ionicons name="settings-outline" size={24} color="#FFA94D" />
              </View>
              <Text style={[styles.actionText, { color: colors.text }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* <LoadingSpinner
        visible={isAnalyzing}
        message={analyzingModel || 'Analyzing X-ray...'}
      /> */}
      
      {/* Bottom safety spacer to prevent overlap with taskbar */}
      <View style={{ height: 45, backgroundColor: colors.background }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
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
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  guestBannerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  uploadCard: { alignItems: 'center', paddingVertical: 24 },
  uploadIcon: { marginBottom: 12 },
  uploadTitle: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  uploadSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 16,
    resizeMode: 'contain',
    backgroundColor: '#00000010',
  },
  previewContainer: {
    width: '100%',
    position: 'relative',
  },
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
  },
  gridLineV: {
    position: 'absolute',
    height: '100%',
    width: 1,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 2,
  },
  cornerTL: { top: 10, left: 10, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 10, right: 10, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 10, left: 10, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 10, right: 10, borderLeftWidth: 0, borderTopWidth: 0 },
  targetBox: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 30,
    height: 30,
    marginTop: -15,
    marginLeft: -15,
    borderWidth: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetInner: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  scanBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 30,
  },
  scanLineInner: {
    height: 2,
    width: '100%',
  },
  scanGlow: {
    height: 20,
    width: '100%',
  },
  scanMaskImproved: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLabelImproved: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  uploadButton: { minWidth: 200 },
  selectionCard: { marginTop: 16 },
  selectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  selectionRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  selectionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectionChipText: { fontSize: 14, fontWeight: '600' },
  analyzeButton: { marginTop: 4 },
  errorCard: {
    marginTop: 4,
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    marginBottom: 8,
  },
  rerunButton: {
    alignSelf: 'flex-start',
  },
  loadingCard: {
    marginTop: 14,
  },
  loadingTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  skeletonBarLg: {
    height: 14,
    borderRadius: 6,
    marginBottom: 8,
    width: '95%',
  },
  skeletonBarMd: {
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
    width: '75%',
  },
  skeletonBarSm: {
    height: 12,
    borderRadius: 6,
    width: '55%',
  },
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  viewAll: { fontSize: 14, fontWeight: '600' },
  resultCard: { marginBottom: 12 },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultBadgeText: { fontSize: 13, fontWeight: '700' },
  resultStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultStatusText: { fontSize: 13, fontWeight: '700' },
  resultDetails: { gap: 4 },
  confidenceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceLabel: { fontSize: 13 },
  confidenceValue: { fontSize: 16, fontWeight: '700' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  processingTime: { fontSize: 11, marginTop: 4 },
  resultMessage: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveStatusText: { fontSize: 12, fontWeight: '500' },
  reportButton: { marginTop: 12 },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    justifyContent: 'center',
  },
  loginPromptText: { fontSize: 12 },
  bothReportsRow: { marginTop: 8 },
  lastScanCard: {},
  lastScanRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lastScanImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  lastScanInfo: { flex: 1, gap: 4 },
  lastScanBadgeRow: { flexDirection: 'row', gap: 8 },
  lastScanModel: { fontSize: 13, fontWeight: '700' },
  lastScanResult: { fontSize: 13, fontWeight: '600' },
  lastScanConfidence: { fontSize: 15, fontWeight: '700' },
  lastScanDate: { fontSize: 12 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
  actionText: { fontSize: 12, fontWeight: '600' },
  disabledCard: { opacity: 0.6 },
  lockIcon: { position: 'absolute', top: 8, right: 8 },
});
