// History Screen with Real API Integration

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/src/context/ThemeContext';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/constants/theme';
import { ResultCard } from '@/components/ResultCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/Button';
import { historyApi } from '@/src/services/api';
import { API_CONFIG } from '@/src/utils/constants';
import type { ScanHistoryItem, DiseaseModel } from '@/src/types';

type FilterType = 'all' | 'tb' | 'pneumonia' | 'Positive' | 'Normal';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isGuest, user } = useAuth();
  const colors = Colors[theme];
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const avatarStorageKey = React.useMemo(() => `@sehatai_avatar_${user?.id ?? 'guest'}`, [user?.id]);

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

  const [scans, setScans] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!isGuest) {
      loadHistory();
    }
  }, [isGuest]);

  const loadHistory = async () => {
    if (isGuest) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await historyApi.getHistory();
      setScans(response.scans);
    } catch (err) {
      console.warn('History load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    if (isGuest) {
      return;
    }
    setIsRefreshing(true);
    await loadHistory();
    setIsRefreshing(false);
  }, [isGuest]);

  const getFilteredScans = (): ScanHistoryItem[] => {
    if (filter === 'all') return scans;
    if (filter === 'tb' || filter === 'pneumonia') {
      return scans.filter(s => s.model_used === filter);
    }
    return scans.filter(s => s.result === filter);
  };

  const getChartData = () => {
    const recent = [...scans].slice(0, 6).reverse();
    if (recent.length === 0) {
      return { labels: ['No Data'], datasets: [{ data: [0] }] };
    }
    return {
      labels: recent.map((_, i) => `${i + 1}`),
      datasets: [
        {
          data: recent.map(s => Math.round(s.confidence * 100)),
          color: () => colors.tint,
          strokeWidth: 2,
        },
      ],
    };
  };

  const chartConfig = {
    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#ffffff',
    backgroundGradientFrom: theme === 'dark' ? '#2A2A2A' : '#ffffff',
    backgroundGradientTo: theme === 'dark' ? '#2A2A2A' : '#ffffff',
    decimalPlaces: 0,
    color: () => colors.tint,
    labelColor: () => colors.text,
    style: { borderRadius: 16 },
    propsForDots: { r: '5', strokeWidth: '2', stroke: colors.tint },
  };

  const stats = {
    total: scans.length,
    tb: scans.filter(s => s.model_used === 'tb').length,
    pneumonia: scans.filter(s => s.model_used === 'pneumonia').length,
    normal: scans.filter(s => s.result === 'Normal').length,
  };

  const filteredScans = getFilteredScans();

  // Guest restriction overlay
  if (isGuest) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.guestOverlay}>
          <View style={[styles.guestContent, { backgroundColor: theme === 'dark' ? '#2A2A2A' : '#fff' }]}>
            <View style={[styles.guestIconContainer, { backgroundColor: colors.tint + '20' }]}>
              <Ionicons name="lock-closed" size={48} color={colors.tint} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>
              Sign In Required
            </Text>
            <Text style={[styles.guestSubtitle, { color: colors.icon }]}>
              Create an account or sign in to view your scan history and track your health progress.
            </Text>
            <Button
              title="Sign In"
              onPress={() => router.push('/login')}
              style={styles.signInButton}
            />
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={[styles.signUpLink, { color: colors.tint }]}>Don't have an account? Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

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
          <View>
            <Text style={[styles.greeting, { color: colors.icon }]}>Welcome back,</Text>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.username || 'User'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <View style={[styles.avatar, { backgroundColor: colors.tint + '20' }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={24} color={colors.tint} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: colors.text }]}>Scan History</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>{stats.total} total scans</Text>
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
        {scans.length > 1 && (
          <View style={styles.chartContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Confidence Trend (%)
            </Text>
            <LineChart
              data={getChartData()}
              width={width - 40}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'tb', 'pneumonia', 'Positive', 'Normal'] as FilterType[]).map(f => (
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
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, { color: filter === f ? '#fff' : colors.text }]}>
                  {f === 'all' ? 'All' : f === 'tb' ? 'TB' : f === 'pneumonia' ? 'Pneumonia' : f}
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
            filteredScans.map(scan => (
              <ResultCard
                key={scan.id}
                model={scan.model_used as DiseaseModel}
                result={scan.result}
                confidence={scan.confidence}
                timestamp={scan.created_at}
                imageUrl={
                  scan.file_url
                    ? `${API_CONFIG.BASE_URL}${scan.file_url}`
                    : undefined
                }
                onPress={() => router.push(`/modal?scanId=${scan.id}`)}
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
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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
  titleBlock: {
    marginBottom: 16,
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
