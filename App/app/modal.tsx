// Report Viewer Modal

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
import * as FileSystem from 'expo-file-system';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { api } from '@/src/services/api';

export default function ReportViewerModal() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [isLoading, setIsLoading] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  const scanId = params.scanId as string;

  const handleGenerateReport = async () => {
    setIsLoading(true);
    try {
      const url = await api.generateReport(scanId);
      setReportUrl(url);
      Alert.alert('Success', 'Report generated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!reportUrl) {
      Alert.alert('Error', 'Please generate report first');
      return;
    }

    setIsLoading(true);
    try {
      const fileUri = FileSystem.documentDirectory + `report_${scanId}.pdf`;
      const downloadResult = await FileSystem.downloadAsync(reportUrl, fileUri);

      if (downloadResult.status === 200) {
        Alert.alert('Success', 'Report downloaded successfully', [
          {
            text: 'Open',
            onPress: () => Linking.openURL(downloadResult.uri),
          },
          { text: 'OK' },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareReport = async () => {
    if (!reportUrl) {
      Alert.alert('Error', 'Please generate report first');
      return;
    }

    setIsLoading(true);
    try {
      const fileUri = FileSystem.documentDirectory + `report_${scanId}.pdf`;
      const downloadResult = await FileSystem.downloadAsync(reportUrl, fileUri);

      if (downloadResult.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri);
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share report');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.tint + '20' },
            ]}
          >
            <Ionicons name="document-text" size={64} color={colors.tint} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Medical Report
          </Text>

          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Generate and download your AI-generated diagnostic report
          </Text>

          {reportUrl ? (
            <Card>
              <View style={styles.reportInfo}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#51CF66"
                />
                <Text style={[styles.reportText, { color: colors.text }]}>
                  Report ready
                </Text>
              </View>
            </Card>
          ) : (
            <Card>
              <View style={styles.reportFeatures}>
                <FeatureItem
                  icon="analytics-outline"
                  text="Detailed diagnostic analysis"
                />
                <FeatureItem
                  icon="medical-outline"
                  text="Confidence scores and metrics"
                />
                <FeatureItem
                  icon="time-outline"
                  text="Scan history and timeline"
                />
                <FeatureItem
                  icon="document-text-outline"
                  text="Professional PDF format"
                />
              </View>
            </Card>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {!reportUrl ? (
              <Button
                title="Generate Report"
                onPress={handleGenerateReport}
                loading={isLoading}
                icon="document-text-outline"
              />
            ) : (
              <>
                <Button
                  title="Download Report"
                  onPress={handleDownloadReport}
                  loading={isLoading}
                  style={styles.actionButton}
                />
                <Button
                  title="Share Report"
                  variant="outline"
                  onPress={handleShareReport}
                  style={styles.actionButton}
                />
                <Button
                  title="View in Browser"
                  variant="secondary"
                  onPress={() => Linking.openURL(reportUrl)}
                  style={styles.actionButton}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <LoadingSpinner visible={isLoading} message="Processing..." />
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
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  reportInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  reportText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reportFeatures: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
  actionButton: {
    marginBottom: 0,
  },
});
