// Result Card Component for displaying scan results

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Card } from './Card';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import type { DiseaseModel } from '@/src/types';

interface ResultCardProps {
  model: DiseaseModel;
  result: 'Positive' | 'Normal';
  confidence: number;   // 0–1 from backend
  timestamp: string;
  imageUrl?: string;
  onPress?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  model,
  result,
  confidence,
  timestamp,
  imageUrl,
  onPress,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const resultColor = result === 'Positive' ? '#FF6B6B' : '#51CF66';
  const modelColor = colors.tint;
  const resultIcon = result === 'Positive' ? 'alert-circle' : 'checkmark-circle';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card onPress={onPress}>
      <View style={styles.container}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: modelColor + '20' }]}>
            <Ionicons name="medical" size={28} color={modelColor} />
          </View>
        )}
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.leftGroup}>
              <Text style={[styles.modelLabel, { color: modelColor }]}>
                {model === 'tb' ? 'TB' : 'Pneumonia'}
              </Text>
              <View style={styles.resultRow}>
                <Ionicons name={resultIcon as any} size={18} color={resultColor} />
                <Text style={[styles.result, { color: resultColor }]}>{result}</Text>
              </View>
            </View>
            <View style={[styles.confidenceBadge, { backgroundColor: resultColor + '20' }]}>
              <Text style={[styles.confidence, { color: resultColor }]}>
                {(confidence * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
          <Text style={[styles.timestamp, { color: colors.icon }]}>
            {formatDate(timestamp)}
          </Text>
          {model === 'pneumonia' && (
            <View style={[styles.gradcamHint, { backgroundColor: colors.tint + '12' }]}>
              <Ionicons name="scan-outline" size={11} color={colors.tint} />
              <Text style={[styles.gradcamHintText, { color: colors.tint }]}>
                Grad-CAM available
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row' },
  image: { width: 72, height: 72, borderRadius: 10, marginRight: 12 },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, justifyContent: 'space-between' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftGroup: { gap: 2 },
  modelLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  result: { fontSize: 16, fontWeight: '700' },
  confidenceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  confidence: { fontSize: 14, fontWeight: '600' },
  timestamp: { fontSize: 12 },
  gradcamHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  gradcamHintText: { fontSize: 10, fontWeight: '600' },
});
