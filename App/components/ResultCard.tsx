// Result Card Component for displaying scan results

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Card } from './Card';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { RESULT_COLORS } from '@/src/utils/constants';
import { Ionicons } from '@expo/vector-icons';

interface ResultCardProps {
  result: 'TB' | 'Pneumonia' | 'Normal';
  confidence: number;
  timestamp: string;
  imageUrl?: string;
  onPress?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  confidence,
  timestamp,
  imageUrl,
  onPress,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const getResultIcon = () => {
    switch (result) {
      case 'Normal':
        return 'checkmark-circle';
      case 'TB':
      case 'Pneumonia':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getResultColor = () => RESULT_COLORS[result];

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
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        )}
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.resultContainer}>
              <Ionicons
                name={getResultIcon() as any}
                size={24}
                color={getResultColor()}
              />
              <Text
                style={[
                  styles.result,
                  { color: getResultColor() },
                ]}
              >
                {result}
              </Text>
            </View>
            <View
              style={[
                styles.confidenceBadge,
                { backgroundColor: `${getResultColor()}20` },
              ]}
            >
              <Text
                style={[
                  styles.confidence,
                  { color: getResultColor() },
                ]}
              >
                {confidence.toFixed(1)}%
              </Text>
            </View>
          </View>
          <Text style={[styles.timestamp, { color: colors.icon }]}>
            {formatDate(timestamp)}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  result: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidence: {
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
  },
});
