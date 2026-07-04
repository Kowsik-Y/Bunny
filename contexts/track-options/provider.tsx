import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Alert } from '@/components/ui/alert';
import { Typography } from '@/components/ui/typography';
import { SwipeBottomSheet, BottomSheetScrollView } from '@/components/player/SwipeBottomSheet';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { styles } from './styles';
import { TrackOptionsContext } from './context';
import { useTrackOptionsState } from './use-track-options-state';
import { SheetsContent } from './sheets-content';


export function TrackOptionsProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const state = useTrackOptionsState();

  const {
    visible,
    setVisible,
    selectedItem,
    sheetScreen,
    newPlaylistVisible,
    setNewPlaylistVisible,
    newPlaylistName,
    setNewPlaylistName,
    showArtistSheet,
    setShowArtistSheet,
    artistOptions,
    dismissQueueVisible,
    setDismissQueueVisible,
    confirmDismissQueue,
    handleCreateNewPlaylist,
    openTrackOptions,
    openAlbumOptions,
    openPlaylistOptions,
    openArtistOptions,
    router,
  } = state;

  return (
    <TrackOptionsContext.Provider value={{ openTrackOptions, openAlbumOptions, openPlaylistOptions, openArtistOptions }}>
      {children}

      {selectedItem && (
        <SwipeBottomSheet
          visible={visible}
          onClose={() => setVisible(false)}
          backgroundColor={colors.card}
          contentKey={sheetScreen}
        >
          <SheetsContent state={state} />
        </SwipeBottomSheet>
      )}

      <SwipeBottomSheet
        visible={newPlaylistVisible}
        onClose={() => setNewPlaylistVisible(false)}
        backgroundColor={colors.card}
      >
        <Text style={[styles.newPlaylistTitle, { color: colors.text }]}>New Playlist</Text>
        <View style={[styles.inputRow, { borderColor: addAlpha(colors.text, 0.12) }]}>
          <Feather name="edit-3" size={18} color={colors.mutedForeground} style={{ marginRight: 10 }} />
          <BottomSheetTextInput
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            placeholder="Playlist name"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.textInput, { color: colors.text }]}
            autoFocus
          />
        </View>
        <Pressable
          onPress={handleCreateNewPlaylist}
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.createBtnText}>Create & Save</Text>
        </Pressable>
      </SwipeBottomSheet>

      <SwipeBottomSheet
        visible={showArtistSheet}
        onClose={() => setShowArtistSheet(false)}
      >
        <Typography variant="large" style={{ fontWeight: '800', textAlign: 'center', marginBottom: 16, marginTop: 10 }}>
          Select Artist
        </Typography>
        <BottomSheetScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          {artistOptions.map((art) => (
            <Pressable
              key={art.id}
              onPress={() => {
                setShowArtistSheet(false);
                router.push(`/artist/${art.id}` as any);
              }}
              style={{
                paddingVertical: 14,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <Typography style={{ fontSize: 16 }}>{art.name}</Typography>
            </Pressable>
          ))}
        </BottomSheetScrollView>
      </SwipeBottomSheet>

      <Alert
        visible={dismissQueueVisible}
        onClose={() => setDismissQueueVisible(false)}
        title="Dismiss Queue"
        description="Clear the entire playback queue?"
        confirmText="Clear"
        cancelText="Cancel"
        onConfirm={confirmDismissQueue}
        variant="destructive"
      />
    </TrackOptionsContext.Provider>
  );
}
