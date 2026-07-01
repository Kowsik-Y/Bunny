import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Typography, Muted } from '@/components/ui/typography';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppTheme } from '@/contexts/app-theme-context';

interface RadioStationItem {
  id: string;
  title: string;
  sub: string;
  color: string;
  url?: string;
}

interface RadioStationsProps {
  stations: RadioStationItem[];
  onStationPress: (station: RadioStationItem) => void;
  loading?: boolean;
}

export function RadioStations({ stations, onStationPress, loading }: RadioStationsProps) {
  const { colors } = useAppTheme();

  if (!loading && stations.length === 0) return null;

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <Typography style={[styles.sectionTitle, { color: colors.text }]}>
          Live Radio
        </Typography>
        <View style={styles.liveRow}>
          <View style={styles.liveDot} />
          <Typography style={styles.liveLabel}>On Air</Typography>
        </View>
      </View>

      {/* Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {loading
          ? [1, 2, 3, 4].map((k) => (
              <Skeleton key={k} style={{ width: 110, height: 40, borderRadius: 20 }} />
            ))
          : stations.map((item, i) => (
              <Animated.View key={item.id} entering={FadeInRight.delay(i * 50).duration(280)}>
                <TouchableOpacity
                  onPress={() => onStationPress(item)}
                  activeOpacity={0.8}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: item.color + '28',
                      borderColor: item.color + '60',
                    },
                  ]}
                >
                  <View style={[styles.chipDot, { backgroundColor: item.color }]} />
                  <View>
                    <Typography numberOfLines={1} style={[styles.chipName, { color: colors.text }]}>
                      {item.title}
                    </Typography>
                    <Muted style={styles.chipSub} numberOfLines={1}>
                      {item.sub}
                    </Muted>
                  </View>
                  <IconSymbol name="antenna.radiowaves.left.and.right" size={14} color={item.color} />
                </TouchableOpacity>
              </Animated.View>
            ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FF4040',
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF4040',
  },
  chips: {
    paddingLeft: 20,
    paddingRight: 12,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 180,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  chipName: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 90,
  },
  chipSub: {
    fontSize: 10,
    maxWidth: 90,
  },
});
