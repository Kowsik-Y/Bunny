import React from 'react';
import { View, Image, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheetScrollView } from '@/components/player/SwipeBottomSheet';
import { useAppTheme } from '@/contexts/app-theme-context';
import { searchYtMusic } from '@/services/ytMusic';
import { PlayerActions, usePlaylists } from '@/services';
import { ActionRow } from '../action-row';
import { TrackOptionsState } from '../use-track-options-state';
import { styles } from '../styles';

interface MainSheetProps {
  state: TrackOptionsState;
}

export function MainSheet({ state }: MainSheetProps) {
  const { colors } = useAppTheme();
  const { deletePlaylist } = usePlaylists();
  const {
    selectedItem,
    selectedTrack,
    isFavorite,
    downloadingIds,
    isDownloaded,
    handleDownload,
    handlePlayNext,
    handleAddToQueue,
    handleToggleLike,
    handleRemoveFromQueue,
    handleGoToAlbum,
    handleGoToArtist,
    handleShare,
    handleDismissQueue,
    handlePlayNextCollection,
    handleAddToQueueCollection,
    handleSaveAlbumToLibrary,
    handleDownloadCollection,
    handleShareCollection,
    handleGoToArtistFromCollection,
    setSheetScreen,
  } = state;

  if (!selectedItem) return null;

  const isLiked = selectedTrack ? isFavorite(selectedTrack.id) : false;

  return (
    <View>
      <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
        {selectedItem.id === 'liked' ? (
          <LinearGradient
            colors={['#8E2DE2', '#4A00E0']}
            style={[styles.artwork, { alignItems: 'center', justifyContent: 'center' }]}
          >
            <Feather name="heart" size={24} color="#ffffff" />
          </LinearGradient>
        ) : (
          <Image
            source={
              selectedItem.artwork && (selectedItem.artwork as string).trim() !== ''
                ? { uri: selectedItem.artwork as string }
                : require('@/assets/images/icon.png')
            }
            style={styles.artwork}
          />
        )}
        <View style={styles.headerInfo}>
          <Text style={[styles.trackTitle, { color: colors.text }]} numberOfLines={1}>
            {selectedItem.title}
          </Text>
          <Text style={{ color: colors.mutedForeground }} numberOfLines={1}>
            {selectedItem.type === 'artist' ? 'Artist' : selectedItem.artist || ''}
            {selectedItem.type === 'track' && selectedTrack?.album ? ` • ${selectedTrack.album}` : ''}
          </Text>
        </View>
      </View>

      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {selectedItem.type === 'track' && selectedTrack && (
          <>
            <ActionRow
              icon={<MaterialCommunityIcons name="playlist-play" size={20} color={colors.text} />}
              label="Play next"
              onPress={handlePlayNext}
            />
            <ActionRow
              icon={<MaterialCommunityIcons name="playlist-plus" size={20} color={colors.text} />}
              label="Add to queue"
              onPress={handleAddToQueue}
            />
            <ActionRow
              icon={<Feather name="bookmark" size={18} color={isLiked ? '#FF3B30' : colors.text} />}
              label={isLiked ? 'Remove from library' : 'Save to library'}
              onPress={handleToggleLike}
              color={isLiked ? '#FF3B30' : undefined}
            />
            {(() => {
              const trackId = selectedTrack.id;
              const dlProgress = downloadingIds[trackId];
              const dlDone = isDownloaded(trackId);
              const isInProgress = dlProgress !== undefined;

              const iconEl = isInProgress ? (
                <MaterialCommunityIcons name="progress-download" size={20} color={colors.primary} />
              ) : dlDone ? (
                <Feather name="check-circle" size={18} color="#34C759" />
              ) : (
                <Feather name="download" size={18} color={colors.text} />
              );

              const labelEl = isInProgress
                ? `Downloading… ${Math.round(dlProgress * 100)}%`
                : dlDone
                ? 'Downloaded  •  Tap to remove'
                : 'Download';

              const labelColor = isInProgress
                ? colors.primary
                : dlDone
                ? '#34C759'
                : colors.text;

              return (
                <Pressable
                  onPress={handleDownload}
                  disabled={isInProgress}
                  android_ripple={{ color: colors.border }}
                  style={[
                    styles.actionRow,
                    { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
                  ]}
                >
                  <View style={styles.actionIcon}>{iconEl}</View>
                  <Text style={[styles.actionText, { color: labelColor }]}>{labelEl}</Text>
                </Pressable>
              );
            })()}
            <ActionRow
              icon={<MaterialCommunityIcons name="playlist-music" size={20} color={colors.text} />}
              label="Save to playlist"
              onPress={() => setSheetScreen('playlists')}
            />
            <ActionRow
              icon={<Feather name="minus-circle" size={18} color={colors.text} />}
              label="Remove from queue"
              onPress={handleRemoveFromQueue}
            />
            {selectedTrack.albumId && (
              <ActionRow
                icon={<MaterialCommunityIcons name="album" size={20} color={colors.text} />}
                label="Go to album"
                onPress={handleGoToAlbum}
              />
            )}
            {selectedTrack.artistId && (
              <ActionRow
                icon={<MaterialCommunityIcons name="account-music" size={20} color={colors.text} />}
                label="Go to artist"
                onPress={handleGoToArtist}
              />
            )}
            <ActionRow
              icon={<Feather name="info" size={18} color={colors.text} />}
              label="View song credits"
              onPress={() => setSheetScreen('credits')}
            />
            <ActionRow
              icon={<Feather name="share-2" size={18} color={colors.text} />}
              label="Share"
              onPress={handleShare}
            />
            <ActionRow
              icon={<MaterialCommunityIcons name="pin" size={20} color={colors.text} />}
              label="Pin to Listen again"
              onPress={state.handlePinListenAgain}
            />
            <ActionRow
              icon={<MaterialCommunityIcons name="chart-bar" size={20} color={colors.text} />}
              label="Stats for nerds"
              onPress={() => setSheetScreen('stats')}
            />
            <ActionRow
              icon={<MaterialCommunityIcons name="playlist-remove" size={20} color={colors.text} />}
              label="Dismiss queue"
              onPress={handleDismissQueue}
              last
            />
          </>
        )}

        {selectedItem.type === 'album' && (
          <>
            <ActionRow
              icon={<MaterialCommunityIcons name="playlist-play" size={20} color={colors.text} />}
              label="Play next"
              onPress={handlePlayNextCollection}
            />
            <ActionRow
              icon={<MaterialCommunityIcons name="playlist-plus" size={20} color={colors.text} />}
              label="Add to queue"
              onPress={handleAddToQueueCollection}
            />
            <ActionRow
              icon={<Feather name="bookmark" size={18} color={colors.text} />}
              label="Save album to library"
              onPress={handleSaveAlbumToLibrary}
            />
            <ActionRow
              icon={<Feather name="download" size={18} color={colors.text} />}
              label="Download all tracks"
              onPress={handleDownloadCollection}
            />
            <ActionRow
              icon={<Feather name="folder-plus" size={18} color={colors.text} />}
              label="Save to playlist"
              onPress={() => setSheetScreen('playlists')}
            />
            {selectedItem.artistId && (
              <ActionRow
                icon={<Feather name="user" size={18} color={colors.text} />}
                label="Go to artist"
                onPress={handleGoToArtistFromCollection}
              />
            )}
            <ActionRow
              icon={<Feather name="share-2" size={18} color={colors.text} />}
              label="Share album"
              onPress={handleShareCollection}
            />
          </>
        )}

        {selectedItem.type === 'playlist' && (
          <>
            <ActionRow
              icon={<MaterialCommunityIcons name="playlist-play" size={20} color={colors.text} />}
              label="Play next"
              onPress={handlePlayNextCollection}
            />
            <ActionRow
              icon={<MaterialCommunityIcons name="playlist-plus" size={20} color={colors.text} />}
              label="Add to queue"
              onPress={handleAddToQueueCollection}
            />
            <ActionRow
              icon={<Feather name="download" size={18} color={colors.text} />}
              label="Download all tracks"
              onPress={handleDownloadCollection}
            />
            <ActionRow
              icon={<Feather name="share-2" size={18} color={colors.text} />}
              label="Share playlist"
              onPress={handleShareCollection}
            />
            {selectedItem.id.startsWith('local-') && (
              <ActionRow
                icon={<Feather name="trash-2" size={18} color="#FF3B30" />}
                label="Delete playlist"
                onPress={() => {
                  state.setVisible(false);
                  Alert.alert(
                    'Delete Playlist',
                    `Are you sure you want to delete "${selectedItem.title}"?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(selectedItem.id) }
                    ]
                  );
                }}
                color="#FF3B30"
              />
            )}
          </>
        )}

        {selectedItem.type === 'artist' && (
          <>
            <ActionRow
              icon={<Feather name="user" size={18} color={colors.text} />}
              label="Go to artist page"
              onPress={() => {
                state.setVisible(false);
                state.router.push(`/artist/${selectedItem.id}` as any);
              }}
            />
            <ActionRow
              icon={<Feather name="shuffle" size={18} color={colors.text} />}
              label="Shuffle play artist"
              onPress={async () => {
                state.setVisible(false);
                try {
                  const searchRes = await searchYtMusic(selectedItem.title + ' songs');
                  if (searchRes.songs.length > 0) {
                    const shuffled = [...searchRes.songs]
                      .sort(() => Math.random() - 0.5)
                      .map((s: any) => ({
                        id: s.id,
                        url: s.url || '',
                        title: s.title || '',
                        artist: s.artist || '',
                        album: s.album || 'Single',
                        artwork: s.thumbnail || '',
                        duration: s.duration || 0,
                        artistId: s.artistId,
                        albumId: s.albumId,
                        artists: s.artists,
                      }));
                    await PlayerActions.playCollection(shuffled as any);
                  }
                } catch (err) {
                  console.error(err);
                }
              }}
            />
            <ActionRow
              icon={<Feather name="share-2" size={18} color={colors.text} />}
              label="Share artist"
              onPress={handleShareCollection}
            />
          </>
        )}
      </BottomSheetScrollView>
    </View>
  );
}
