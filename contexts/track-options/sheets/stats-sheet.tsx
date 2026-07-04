import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '@/contexts/app-theme-context';
import { TrackOptionsState } from '../use-track-options-state';
import { styles } from '../styles';

interface StatsSheetProps {
  state: TrackOptionsState;
}

export function StatsSheet({ state }: StatsSheetProps) {
  const { colors } = useAppTheme();
  const { selectedTrack, setSheetScreen } = state;

  if (!selectedTrack) return null;

  return (
    <View>
      <View style={styles.subHeader}>
        <Pressable onPress={() => setSheetScreen('main')} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.subHeaderTitle, { color: colors.text }]}>Stats for Nerds</Text>
      </View>
      {[
        { label: 'Decoder', value: 'ExoPlayer (AAC / OPUS)' },
        { label: 'Connection', value: 'HTTPS Stream' },
        { label: 'Active Itag', value: selectedTrack.activeItag ? String(selectedTrack.activeItag) : 'Default (140)' },
        ...(selectedTrack.streamHost ? [{ label: 'Host', value: selectedTrack.streamHost }] : []),
        { label: 'Duration', value: `${selectedTrack.duration}s` },
      ].map((row, i, arr) => (
        <View
          key={row.label}
          style={[
            styles.creditRow,
            i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
          ]}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{row.label}</Text>
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}
