import React from 'react';
import { View, Pressable, Text, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@/components/player/SwipeBottomSheet';
import { useAppTheme } from '@/contexts/app-theme-context';
import { ActionRow } from '../action-row';
import { TrackOptionsState } from '../use-track-options-state';
import { styles } from '../styles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PlaylistsSheetProps {
  state: TrackOptionsState;
}

export function PlaylistsSheet({ state }: PlaylistsSheetProps) {
  const { colors } = useAppTheme();
  const {
    selectedItem,
    setSheetScreen,
    playlists,
    handleAddToPlaylist,
    handleAddCollectionToPlaylist,
    setNewPlaylistVisible,
  } = state;

  return (
    <View>
      <View style={styles.subHeader}>
        <Pressable onPress={() => setSheetScreen('main')} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.subHeaderTitle, { color: colors.text }]}>Save to Playlist</Text>
      </View>
      <BottomSheetScrollView
        style={{ maxHeight: SCREEN_HEIGHT * 0.72 }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <ActionRow
          icon={<Feather name="plus-circle" size={18} color={colors.primary} />}
          label="Create new playlist"
          onPress={() => setNewPlaylistVisible(true)}
          color={colors.primary}
        />
        {playlists.map((pl, i) => (
          <ActionRow
            key={pl.id}
            icon={<Feather name="music" size={18} color={colors.text} />}
            label={pl.name}
            onPress={() => {
              if (selectedItem?.type === 'track') {
                handleAddToPlaylist(pl.id);
              } else {
                handleAddCollectionToPlaylist(pl.id);
              }
            }}
            last={i === playlists.length - 1}
          />
        ))}
      </BottomSheetScrollView>
    </View>
  );
}
