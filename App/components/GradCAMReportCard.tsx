import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from './Card';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/src/context/ThemeContext';
import type { DetailedPneumoniaPrediction, LungZoneAnalysis } from '@/src/types';

interface Props {
  report: DetailedPneumoniaPrediction;
  onExportPDF?: () => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  High: '#FF6B6B',
  Medium: '#FFA94D',
  Low: '#FFD43B',
  Minimal: '#51CF66',
};

const IMAGE_TABS = [
  { b64Key: 'original_b64', urlKey: 'original_url', label: 'Original X-Ray', icon: 'image-outline' },
  { b64Key: 'clahe_b64', urlKey: 'clahe_url', label: 'CLAHE Enhanced', icon: 'contrast-outline' },
  { b64Key: 'heatmap_b64', urlKey: 'heatmap_url', label: 'Grad-CAM Heatmap', icon: 'flame-outline' },
  { b64Key: 'overlay_b64', urlKey: 'overlay_url', label: 'AI Attention Overlay', icon: 'scan-outline' },
] as const;

type TabKey = typeof IMAGE_TABS[number]['b64Key'];

export const GradCAMReportCard: React.FC<Props> = ({ report, onExportPDF }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [activeTab, setActiveTab] = useState<TabKey>('overlay_b64');

  const { gradcam } = report;
  const activeTabDef = IMAGE_TABS.find(t => t.b64Key === activeTab)!;

  const b64Value = gradcam[activeTab as keyof typeof gradcam] as string | null;
  const urlKey = activeTabDef.urlKey as keyof typeof gradcam;
  const urlValue = gradcam[urlKey] as string | null;
  const imageSource = b64Value
    ? { uri: `data:image/png;base64,${b64Value}` }
    : urlValue
      ? { uri: urlValue }
      : null;

  const isHeatmapView = activeTab === 'heatmap_b64' || activeTab === 'overlay_b64';

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="scan" size={20} color={colors.tint} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Grad-CAM Analysis Report</Text>
        </View>
        {onExportPDF && (
          <TouchableOpacity onPress={onExportPDF} style={styles.exportBtn}>
            <Ionicons name="document-text-outline" size={16} color={colors.tint} />
            <Text style={[styles.exportText, { color: colors.tint }]}>PDF</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {IMAGE_TABS.map(tab => {
          const isActive = activeTab === tab.b64Key;
          return (
            <TouchableOpacity
              key={tab.b64Key}
              style={[
                styles.tab,
                {
                  backgroundColor: isActive ? colors.tint : colors.tint + '15',
                  borderColor: colors.tint,
                },
              ]}
              onPress={() => setActiveTab(tab.b64Key)}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={12}
                color={isActive ? '#fff' : colors.tint}
              />
              <Text style={[styles.tabText, { color: isActive ? '#fff' : colors.tint }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.imageContainer, { backgroundColor: '#000' }]}>
        {imageSource ? (
          <Image source={imageSource} style={styles.mainImage} resizeMode="contain" />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={32} color="#666" />
            <Text style={styles.imageFallbackText}>Image unavailable</Text>
          </View>
        )}
        <View style={styles.imageLabelOverlay}>
          <Text style={styles.imageLabelText}>{activeTabDef.label}</Text>
        </View>
      </View>

      {isHeatmapView && (
        <View
          style={[
            styles.legend,
            { backgroundColor: colors.tint + '10', borderColor: colors.tint + '30' },
          ]}
        >
          <Text style={[styles.legendTitle, { color: colors.text }]}>Heatmap Key</Text>
          {[
            { color: '#FF0000', label: 'Red - High activation (strong disease focus)' },
            { color: '#FFA500', label: 'Orange - Medium activation' },
            { color: '#FFFF00', label: 'Yellow - Low activation' },
            { color: '#0000FF', label: 'Blue - Minimal / no activation' },
          ].map(({ color, label }) => (
            <View key={color} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={[styles.legendText, { color: colors.icon }]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: colors.tint + '15' }]}>
          <Text style={[styles.statValue, { color: colors.tint }]} numberOfLines={2}>
            {gradcam.primary_affected_zone}
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Primary Zone</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.tint + '15' }]}>
          <Text style={[styles.statValue, { color: colors.tint }]}>
            {(gradcam.overall_activation * 100).toFixed(1)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Overall Activation</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: colors.tint + '15' }]}>
          <Text style={[styles.statValue, { color: colors.tint }]}>
            {gradcam.affected_zones.length} / 5
          </Text>
          <Text style={[styles.statLabel, { color: colors.icon }]}>Zones Affected</Text>
        </View>
      </View>

      <Text style={[styles.zonesTitle, { color: colors.text }]}>Lung Zone Breakdown</Text>

      {gradcam.lung_zones.map((zone: LungZoneAnalysis) => {
        const sevColor = SEVERITY_COLORS[zone.severity] ?? '#888888';
        return (
          <View key={zone.zone} style={styles.zoneRow}>
            <View style={styles.zoneLeft}>
              <View style={[styles.zoneDot, { backgroundColor: sevColor }]} />
              <Text style={[styles.zoneName, { color: colors.text }]} numberOfLines={2}>
                {zone.zone}
              </Text>
            </View>
            <View style={styles.zoneRight}>
              <View style={[styles.zoneBarTrack, { backgroundColor: colors.icon + '25' }]}>
                <View
                  style={[
                    styles.zoneBarFill,
                    {
                      width: `${Math.round(zone.mean_activation * 100)}%` as `${number}%`,
                      backgroundColor: sevColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.zoneSeverity, { color: sevColor }]}>{zone.severity}</Text>
              <Text style={[styles.zoneScore, { color: colors.icon }]}>
                {(zone.mean_activation * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        );
      })}

      <View
        style={[
          styles.thresholdNote,
          { backgroundColor: colors.icon + '10', borderColor: colors.icon + '20' },
        ]}
      >
        <Ionicons name="information-circle-outline" size={14} color={colors.icon} />
        <Text style={[styles.thresholdText, { color: colors.icon }]}>
          Decision threshold: {(report.threshold * 100).toFixed(0)}%.  Model confidence:{' '}
          {(report.confidence * 100).toFixed(1)}%.  Result: {report.result}.
        </Text>
      </View>

      <Text style={[styles.processingTime, { color: colors.icon }]}>
        Analysis time: {report.processing_time.toFixed(2)}s  ·  Conv layer: {gradcam.last_conv_layer}
      </Text>

      <Text style={[styles.disclaimer, { color: colors.icon }]}>
        AI-assisted screening only. Not a substitute for professional medical diagnosis. Always
        consult a qualified physician for clinical decisions.
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 16 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  exportText: { fontSize: 13, fontWeight: '600' },

  tabsScroll: { marginBottom: 12 },
  tabsContent: { flexDirection: 'row', gap: 8, paddingRight: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabText: { fontSize: 11, fontWeight: '600' },

  imageContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mainImage: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  imageFallbackText: { color: '#666', fontSize: 13 },
  imageLabelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
  },
  imageLabelText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  legend: { marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1, gap: 5 },
  legendTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, flex: 1 },

  statsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statBox: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  statLabel: { fontSize: 10, textAlign: 'center' },

  zonesTitle: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 10 },

  zoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  zoneLeft: { width: 120, flexDirection: 'row', alignItems: 'center', gap: 6 },
  zoneDot: { width: 9, height: 9, borderRadius: 5, flexShrink: 0 },
  zoneName: { fontSize: 11, fontWeight: '500', flex: 1 },
  zoneRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  zoneBarTrack: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  zoneBarFill: { height: '100%', borderRadius: 4 },
  zoneSeverity: { fontSize: 10, fontWeight: '700', width: 46 },
  zoneScore: { fontSize: 10, width: 38, textAlign: 'right' },

  thresholdNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  thresholdText: { fontSize: 11, flex: 1, lineHeight: 17 },

  processingTime: { fontSize: 10, marginTop: 10, textAlign: 'center' },
  disclaimer: { fontSize: 10, textAlign: 'center', marginTop: 10, lineHeight: 15, paddingHorizontal: 4 },
});
