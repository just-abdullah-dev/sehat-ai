// Report Viewer Modal — Real PDF download with language selection and auth gate

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { reportApi } from '@/src/services/api';
import type { ReportLanguage } from '@/src/types';

export default function ReportViewerModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { isAuthenticated, isGuest } = useAuth();
  const colors = Colors[theme];

  const [isLoading, setIsLoading] = useState(false);
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);
  const [language, setLanguage] = useState<ReportLanguage>('en');

  const rawScanId = params.scanId as string | undefined;
  const scanId = rawScanId ? parseInt(rawScanId, 10) : null;
  const isValidScanId = scanId !== null && !isNaN(scanId) && scanId > 0;

  // ── Auth gate: guests cannot download reports ─────────────────────────────

  if (isGuest || !isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.guestGate}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="lock-closed" size={64} color={colors.tint} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Sign In Required</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Reports are only available for registered users. Sign in to download and share your diagnostic reports.
          </Text>
          <Button
            title="Sign In"
            onPress={() => { router.back(); router.push('/login'); }}
            style={styles.signInButton}
          />
        </View>
      </View>
    );
  }

  // ── Validate scanId ───────────────────────────────────────────────────────

  if (!isValidScanId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.guestGate}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Invalid Scan</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            No valid scan ID found. Please run a new analysis and try again.
          </Text>
          <Button
            title="Back"
            onPress={() => router.back()}
            style={styles.signInButton}
          />
        </View>
      </View>
    );
  }

  // ── Download PDF from backend ─────────────────────────────────────────────

  const downloadReport = async (): Promise<string | null> => {
    const reportUrl = reportApi.getReportUrl(scanId, language);
    const authHeader = await reportApi.getAuthHeader();

    if (!authHeader) {
      throw new Error('Session expired. Please sign in again and retry.');
    }

    if (!FileSystem.documentDirectory) {
      throw new Error('Unable to access local storage on this device.');
    }

    const fileUri = `${FileSystem.documentDirectory}sehatai_report_${scanId}_${language}.pdf`;

    const downloadResult = await FileSystem.downloadAsync(reportUrl, fileUri, {
      headers: { Authorization: authHeader },
    });

    if (downloadResult.status >= 200 && downloadResult.status < 300) {
      return downloadResult.uri;
    }

    if (downloadResult.status === 401) {
      throw new Error('Session expired. Please sign in again and retry.');
    }

    if (downloadResult.status === 404) {
      throw new Error('Report not found for this scan.');
    }

    throw new Error(`Download failed (HTTP ${downloadResult.status}). Please try again.`);
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const uri = await downloadReport();
      if (!uri) return;
      setDownloadedUri(uri);
      Alert.alert('Report Downloaded', 'Your report has been saved.', [
        { text: 'Open', onPress: () => Linking.openURL(uri) },
        { text: 'OK' },
      ]);
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert('Download Failed', error.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    setIsLoading(true);
    try {
      let uri = downloadedUri;
      if (!uri) {
        uri = await downloadReport();
        if (!uri) return;
        setDownloadedUri(uri);
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Sharing unavailable', 'Sharing is not supported on this device.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert('Share Failed', error.message || 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewInBrowser = () => {
    const url = reportApi.getReportUrl(scanId, language);
    Linking.openURL(url);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
            <Ionicons name="document-text" size={64} color={colors.tint} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Medical Report</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Download your AI-generated diagnostic report as PDF
          </Text>

          {/* Language Selection */}
          <Card style={styles.languageCard}>
            <Text style={[styles.languageTitle, { color: colors.text }]}>Report Language</Text>
            <View style={styles.languageRow}>
              {(['en', 'ur'] as ReportLanguage[]).map(lang => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.langChip,
                    {
                      backgroundColor: language === lang ? colors.tint : colors.tint + '15',
                      borderColor: colors.tint,
                    },
                  ]}
                  onPress={() => { setLanguage(lang); setDownloadedUri(null); }}
                >
                  <Text style={[styles.langChipText, { color: language === lang ? '#fff' : colors.tint }]}>
                    {lang === 'en' ? 'English' : 'اردو (Urdu)'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Report Ready Indicator */}
          {downloadedUri && (
            <Card>
              <View style={styles.reportInfo}>
                <Ionicons name="checkmark-circle" size={24} color="#51CF66" />
                <Text style={[styles.reportText, { color: colors.text }]}>Report ready</Text>
              </View>
            </Card>
          )}

          {/* Features List (before download) */}
          {!downloadedUri && (
            <Card>
              <View style={styles.reportFeatures}>
                <FeatureItem icon="analytics-outline" text="Detailed diagnostic analysis" />
                <FeatureItem icon="medical-outline" text="Confidence scores and metrics" />
                <FeatureItem icon="time-outline" text="Scan history and timeline" />
                <FeatureItem icon="document-text-outline" text="Professional PDF format" />
                <FeatureItem icon="language-outline" text="Bilingual support (English & Urdu)" />
              </View>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              title={downloadedUri ? 'Download Again' : 'Download Report'}
              onPress={handleDownload}
              loading={isLoading}
              style={styles.actionButton}
            />
            <Button
              title="Share Report"
              variant="outline"
              onPress={handleShare}
              loading={isLoading}
              style={styles.actionButton}
            />
            <Button
              title="View in Browser"
              variant="secondary"
              onPress={handleViewInBrowser}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>

      <LoadingSpinner visible={isLoading} message="Downloading report..." />
    </View>
  );
}

const FeatureItem = ({ icon, text }: { icon: string; text: string }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon as any} size={20} color={colors.tint} />
      <Text style={[styles.featureText, { color: colors.text }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
  closeButton: { padding: 8 },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 40 },
  guestGate: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  signInButton: { width: '100%' },
  languageCard: { marginBottom: 16 },
  languageTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  languageRow: { flexDirection: 'row', gap: 10 },
  langChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  langChipText: { fontSize: 14, fontWeight: '600' },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  reportText: { fontSize: 16, fontWeight: '600' },
  reportFeatures: { gap: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 14, flex: 1 },
  actions: { marginTop: 24, gap: 12 },
  actionButton: { marginBottom: 0 },
});
