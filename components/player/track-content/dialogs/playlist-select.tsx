import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography as Text } from '@/components/ui/typography';
import { BottomSheetScrollView } from '../../SwipeBottomSheet';
import { useAppTheme } from '@/contexts/app-theme-context';
import { PlayerSheet } from './player-sheet';
import { styles } from '../styles';

interface PlaylistSelectProps {
  visible: boolean;
  onClose: () => void;
  playlists: any[];
  onSelectPlaylist: (playlistId: string, name: string) => void;
  onCreateNewPlaylist: () => void;
}

export function PlaylistSelect({
  visible,
  onClose,
  playlists,
  onSelectPlaylist,
  onCreateNewPlaylist,
}: PlaylistSelectProps) {
  const { colors } = useAppTheme();

  return (
    <PlayerSheet
      visible={visible}
      onClose={onClose}
      title="Add to Playlist"
    >
      <BottomSheetScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
        <Pressable
          android_ripple={{ color: colors.border }}
          onPress={onCreateNewPlaylist}
          style={[styles.deviceRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' }]}
        >
          <Feather name="plus-circle" size={20} color={colors.mutedForeground} style={{ marginRight: 15 }} />
          <Text style={[styles.deviceText, { color: colors.mutedForeground, fontWeight: '700' }]}>Create New Playlist...</Text>
        </Pressable>

        {playlists.length === 0 ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <Text style={{ color: colors.mutedForeground }}>No playlists available</Text>
          </View>
        ) : (
          playlists.map((pl) => (
            <Pressable
              android_ripple={{ color: colors.border }}
              key={pl.id}
              onPress={() => onSelectPlaylist(pl.id, pl.name)}
              style={styles.deviceRow}
            >
              <Feather name="folder" size={20} color={colors.text} style={{ marginRight: 15 }} />
              <Text style={[styles.deviceText, { color: colors.text }]}>{pl.name}</Text>
            </Pressable>
          ))
        )}
      </BottomSheetScrollView>
    </PlayerSheet>
  );
}
