// Report Viewer Modal — Real PDF download with auth gate

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { reportApi } from '@/src/services/api';

export default function ReportViewerModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { isAuthenticated, isGuest } = useAuth();
  const colors = Colors[theme];

  const [isLoading, setIsLoading] = useState(false);
  const [downloadedUri, setDownloadedUri] = useState<string | null>(null);

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
          <Text style={[styles.title, { color: colors.text }]}>{t('modal.signInRequired')}</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {t('modal.signInRequiredBody')}
          </Text>
          <Button
            title={t('settings.signIn')}
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
          <Text style={[styles.title, { color: colors.text }]}>{t('modal.invalidScan')}</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {t('modal.invalidScanBody')}
          </Text>
          <Button
            title={t('modal.back')}
            onPress={() => router.back()}
            style={styles.signInButton}
          />
        </View>
      </View>
    );
  }

  // ── Download PDF from backend ─────────────────────────────────────────────

  const downloadReport = async (): Promise<string | null> => {
    const reportUrl = reportApi.getReportUrl(scanId);
    const authHeader = await reportApi.getAuthHeader();

    if (!authHeader) {
      throw new Error(t('modal.errors.sessionExpired'));
    }

    if (!FileSystem.documentDirectory) {
      throw new Error(t('modal.errors.storageUnavailable'));
    }

    const fileUri = `${FileSystem.documentDirectory}sehatai_report_${scanId}_en.pdf`;

    const downloadResult = await FileSystem.downloadAsync(reportUrl, fileUri, {
      headers: { Authorization: authHeader },
    });

    if (downloadResult.status >= 200 && downloadResult.status < 300) {
      return downloadResult.uri;
    }

    if (downloadResult.status === 401) {
      throw new Error(t('modal.errors.sessionExpired'));
    }

    if (downloadResult.status === 404) {
      throw new Error(t('modal.errors.reportNotFound'));
    }

    throw new Error(t('modal.errors.downloadFailedWithCode', { status: downloadResult.status }));
  };

  const openReport = async (uri: string) => {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error(t('modal.errors.noPdfApp'));
    }
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const uri = await downloadReport();
      if (!uri) return;
      setDownloadedUri(uri);
      Alert.alert(t('modal.alerts.reportDownloadedTitle'), t('modal.alerts.reportDownloadedBody'), [
        {
          text: t('modal.open'),
          onPress: () => {
            void openReport(uri).catch((error: Error) => {
              Alert.alert(t('modal.alerts.openFailedTitle'), error.message || t('modal.alerts.tryShare')); 
            });
          },
        },
        { text: t('modal.ok') },
      ]);
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert(t('modal.alerts.downloadFailedTitle'), error.message || t('modal.alerts.tryAgain'));
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
        Alert.alert(t('modal.alerts.sharingUnavailableTitle'), t('modal.alerts.sharingUnavailableBody'));
      }
    } catch (err: unknown) {
      const error = err as Error;
      Alert.alert(t('modal.alerts.shareFailedTitle'), error.message || t('modal.alerts.tryAgain'));
    } finally {
      setIsLoading(false);
    }
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

          <Text style={[styles.title, { color: colors.text }]}>{t('modal.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {t('modal.subtitle')}
          </Text>

          {/* Report Ready Indicator */}
          {downloadedUri && (
            <Card>
              <View style={styles.reportInfo}>
                <Ionicons name="checkmark-circle" size={24} color="#51CF66" />
                <Text style={[styles.reportText, { color: colors.text }]}>{t('modal.reportReady')}</Text>
              </View>
            </Card>
          )}

          {/* Features List (before download) */}
          {!downloadedUri && (
            <Card>
              <View style={styles.reportFeatures}>
                <FeatureItem icon="analytics-outline" text={t('modal.features.analysis')} />
                <FeatureItem icon="medical-outline" text={t('modal.features.confidence')} />
                <FeatureItem icon="time-outline" text={t('modal.features.history')} />
                <FeatureItem icon="document-text-outline" text={t('modal.features.pdf')} />
                <FeatureItem icon="person-outline" text={t('modal.features.account')} />
              </View>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Button
              title={downloadedUri ? t('modal.downloadAgain') : t('modal.downloadReport')}
              onPress={handleDownload}
              loading={isLoading}
              style={styles.actionButton}
            />
            <Button
              title={t('modal.shareReport')}
              variant="outline"
              onPress={handleShare}
              loading={isLoading}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>

      <LoadingSpinner visible={isLoading} message={t('modal.downloading')} />
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
