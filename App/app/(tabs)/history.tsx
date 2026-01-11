// History Screen with Progress Tracking

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/src/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { ResultCard } from '@/components/ResultCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { api } from '@/src/services/api';
import { storage } from '@/src/utils/storage';
import type { Scan } from '@/src/types';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'TB' | 'Pneumonia' | 'Normal'>('all');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const history = await api.getHistory();
      setScans(history);

      // Cache for offline access
      await storage.setCachedScans(history);
    } catch (error) {
      console.error('Error loading history:', error);
      // Load from cache if API fails
      const cached = await storage.getCachedScans();
      setScans(cached);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadHistory();
    setIsRefreshing(false);
  };

  const getFilteredScans = () => {
    if (filter === 'all') return scans;
    return scans.filter(scan => scan.result === filter);
  };

  const getChartData = () => {
    const recentScans = scans.slice(0, 6).reverse();

    if (recentScans.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }

    return {
      labels: recentScans.map((_, index) => `Scan ${index + 1}`),
      datasets: [
        {
          data: recentScans.map(scan => scan.confidence),
          color: (opacity = 1) => colors.tint,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartConfig = {
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#ffffff',
    backgroundGradientFrom: theme === 'dark' ? '#2A2A2A' : '#ffffff',
    backgroundGradientTo: theme === 'dark' ? '#2A2A2A' : '#ffffff',
    decimalPlaces: 1,
    color: (opacity = 1) => colors.tint,
    labelColor: (opacity = 1) => colors.text,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: colors.tint,
    },
  };

  const getStats = () => {
    const total = scans.length;
    const tb = scans.filter(s => s.result === 'TB').length;
    const pneumonia = scans.filter(s => s.result === 'Pneumonia').length;
    const normal = scans.filter(s => s.result === 'Normal').length;

    return { total, tb, pneumonia, normal };
  };

  const stats = getStats();
  const filteredScans = getFilteredScans();

  if (isLoading) {
    return <LoadingSpinner visible={true} message="Loading history..." />;
  }

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
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Scan History
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            {stats.total} total scans
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: '#FF6B6B20' }]}>
              <Ionicons name="medical" size={20} color="#FF6B6B" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.tb}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>TB</Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: '#FFA94D20' }]}>
              <Ionicons name="fitness" size={20} color="#FFA94D" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.pneumonia}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>
              Pneumonia
            </Text>
          </View>

          <View
            style={[
              styles.statCard,
              { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' },
            ]}
          >
            <View style={[styles.statIcon, { backgroundColor: '#51CF6620' }]}>
              <Ionicons name="checkmark-circle" size={20} color="#51CF66" />
            </View>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats.normal}
            </Text>
            <Text style={[styles.statLabel, { color: colors.icon }]}>
              Normal
            </Text>
          </View>
        </View>

        {/* Progress Chart */}
        {scans.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Confidence Trend
            </Text>
            <LineChart
              data={getChartData()}
              width={width - 40}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['all', 'TB', 'Pneumonia', 'Normal'].map((f) => (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor:
                      filter === f
                        ? colors.tint
                        : theme === 'dark'
                        ? '#2A2A2A'
                        : '#F5F5F5',
                  },
                ]}
                onPress={() => setFilter(f as any)}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color:
                        filter === f ? '#fff' : colors.text,
                    },
                  ]}
                >
                  {f === 'all' ? 'All' : f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Scan List */}
        <View style={styles.listContainer}>
          {filteredScans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color={colors.icon} />
              <Text style={[styles.emptyText, { color: colors.icon }]}>
                No scans found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.icon }]}>
                Upload your first X-ray to get started
              </Text>
            </View>
          ) : (
            filteredScans.map((scan) => (
              <ResultCard
                key={scan.id}
                result={scan.result}
                confidence={scan.confidence}
                timestamp={scan.timestamp}
                imageUrl={scan.imageUrl}
              />
            ))
          )}
        </View>
      </ScrollView>
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
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
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
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  chartContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  filterContainer: {
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
});
