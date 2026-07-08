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
  const { selectedTrack, setCreditsVisible, router, setVisible } = state;

  if (!selectedTrack) return null;

  const rows = [
    { label: 'Title', value: selectedTrack.title },
    { 
      label: 'Artist', 
      value: selectedTrack.artist,
      onPress: selectedTrack.artistId ? () => {
        router.push(`/artist/${selectedTrack.artistId}`);
        setVisible(false);
      } : undefined
    },
    ...(selectedTrack.album ? [{ 
      label: 'Album', 
      value: selectedTrack.album,
      onPress: selectedTrack.albumId ? () => {
        router.push(`/album/${selectedTrack.albumId}`);
        setVisible(false);
      } : undefined
    }] : []),
    ...(selectedTrack.streamHost ? [{ label: 'Stream Provider', value: selectedTrack.streamHost }] : []),
    { label: 'Track ID', value: selectedTrack.id, mono: true },
  ];

  return (
    <View>
      <View style={styles.subHeader}>
        <Text style={[styles.subHeaderTitle, { color: colors.text }]}>Song Credits</Text>
      </View>
      {rows.map((row, i, arr) => {
        const hasLink = !!row.onPress;
        const ValueComponent = hasLink ? Pressable : View;
        return (
          <View
            key={row.label}
            style={[
              styles.creditRow,
              i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
            ]}
          >
            <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{row.label}</Text>
            <ValueComponent onPress={row.onPress} style={{ flexShrink: 1 }}>
              <Text
                style={[
                  { color: hasLink ? colors.primary : colors.text, fontWeight: '600', fontSize: 14, textAlign: 'right' },
                  row.mono ? { fontFamily: 'monospace', fontSize: 11 } : {},
                  hasLink ? { textDecorationLine: 'underline' } : {}
                ]}
                numberOfLines={2}
              >
                {row.value}
              </Text>
            </ValueComponent>
          </View>
        );
      })}
    </View>
  );
}
