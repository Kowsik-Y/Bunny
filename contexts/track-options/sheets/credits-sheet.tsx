import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { TrackOptionsState } from '../use-track-options-state';
import { styles } from '../styles';

interface CreditsSheetProps {
  state: TrackOptionsState;
}

export function CreditsSheet({ state }: CreditsSheetProps) {
  const { colors } = useAppTheme();
  const { selectedTrack, setSheetScreen } = state;

  if (!selectedTrack) return null;

  return (
    <View>
      <View style={styles.subHeader}>
        <Pressable onPress={() => setSheetScreen('main')} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.subHeaderTitle, { color: colors.text }]}>Song Credits</Text>
      </View>
      {[
        { label: 'Title', value: selectedTrack.title },
        { label: 'Artist', value: selectedTrack.artist },
        ...(selectedTrack.album ? [{ label: 'Album', value: selectedTrack.album }] : []),
        ...(selectedTrack.streamHost ? [{ label: 'Stream Provider', value: selectedTrack.streamHost }] : []),
        { label: 'Track ID', value: selectedTrack.id, mono: true },
      ].map((row, i, arr) => (
        <View
          key={row.label}
          style={[
            styles.creditRow,
            i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
          ]}
        >
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{row.label}</Text>
          <Text
            style={[
              { color: colors.text, fontWeight: '600', fontSize: 14, flexShrink: 1, textAlign: 'right' },
              row.mono ? { fontFamily: 'monospace', fontSize: 11 } : {},
            ]}
            numberOfLines={2}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}
