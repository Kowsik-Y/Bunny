import React from 'react';
import { View, Image, Text, Pressable, StyleSheet, DeviceEventEmitter } from 'react-native';
import { ThumbsUp, ListVideo, ListPlus, Bookmark, Loader2, CheckCircle2, Download, ListMusic, MinusCircle, Disc, User, Info, Share2, Pin, BarChart2, ListX, FolderPlus, Trash2, Shuffle, Save, PhoneCall } from 'lucide-react-native';
import { Alert } from '@/components/ui/alert';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomSheetScrollView } from '@/components/player/SwipeBottomSheet';
import { useAppTheme } from '@/contexts/app-theme-context';
import { searchYtMusic } from '@/services/ytMusic';
import { PlayerActions, usePlaylists, useCurrentTrack, useDownloads } from '@/services';
import { ActionRow } from '../action-row';
import { TrackOptionsState } from '../use-track-options-state';
import { styles } from '../styles';

interface MainSheetProps {
  state: TrackOptionsState;
}

export function MainSheet({ state }: MainSheetProps) {
  const { colors } = useAppTheme();
  const { deletePlaylist } = usePlaylists();
  const { hasDownloadedLrc } = useDownloads();
  const [deleteAlertVisible, setDeleteAlertVisible] = React.useState(false);
  const currentTrack = useCurrentTrack();
  const {
    selectedItem,
    selectedTrack,
    isFavorite,
    downloadingIds,
    isDownloaded,
    isInQueue,
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
    setCreditsVisible,
    setVisible,
  } = state;

  if (!selectedItem) return null;


  const handleCreditsPress = () => {
    setVisible(false);
    setTimeout(() => {
      setCreditsVisible(true);
    }, 350);
  };

  const isCurrentTrackActive = !!(
    currentTrack &&
    selectedTrack &&
    (currentTrack.id === selectedTrack.id ||
      (currentTrack.id && currentTrack.id.includes(selectedTrack.id)) ||
      (selectedTrack.id && selectedTrack.id.includes(currentTrack.id)))
  );

  const isLiked = selectedTrack ? isFavorite(selectedTrack.id) : false;

  return (
    <View>
      <View style={[styles.header]}>
        {selectedItem.id === 'liked' ? (
          <LinearGradient
            colors={['#8E2DE2', '#4A00E0']}
            style={[styles.artwork, { alignItems: 'center', justifyContent: 'center' }]}
          >
            <ThumbsUp size={24} color="#ffffff" />
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
            {!isCurrentTrackActive && (
              <>
                <ActionRow
                  icon={<ListVideo size={20} color={colors.text} />}
                  label="Play next"
                  onPress={handlePlayNext}
                />
                {isInQueue ? (
                  <ActionRow
                    icon={<CheckCircle2 size={20} color={colors.mutedForeground} />}
                    label="Already in queue"
                    onPress={() => { }}
                    color={colors.mutedForeground}
                  />
                ) : (
                  <ActionRow
                    icon={<ListPlus size={20} color={colors.text} />}
                    label="Add to queue"
                    onPress={handleAddToQueue}
                  />
                )}
              </>
            )}
            <ActionRow
              icon={<ThumbsUp size={18} color={isLiked ? '#FF3B30' : colors.text} />}
              label={isLiked ? 'Remove from library' : 'Save to library'}
              onPress={handleToggleLike}
              color={isLiked ? '#FF3B30' : undefined}
            />
            {(() => {
              const trackId = selectedTrack.id;
              const dlProgress = downloadingIds[trackId];
              const dlDone = isDownloaded(trackId);
              const isInProgress = dlProgress !== undefined;
              const hasLrc = hasDownloadedLrc(trackId);

              const iconEl = isInProgress ? (
                <Loader2 size={20} color={colors.primary} />
              ) : dlDone ? (
                <Save size={18} color="#34C759" />
              ) : (
                <Download size={18} color={colors.text} />
              );

              const labelEl = isInProgress
                ? dlProgress >= 0.95
                  ? dlProgress >= 0.97
                    ? 'Embedding metadata…'
                    : 'Getting LRC…'
                  : `Downloading… ${Math.round((dlProgress / 0.95) * 100)}%`
                : dlDone
                  ? hasLrc
                    ? 'Downloaded • LRC'
                    : 'Downloaded'
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
              icon={<ListMusic size={20} color={colors.text} />}
              label="Save to playlist"
              onPress={() => setSheetScreen('playlists')}
            />
            {!isCurrentTrackActive && isInQueue && (
              <ActionRow
                icon={<MinusCircle size={18} color={colors.text} />}
                label="Remove from queue"
                onPress={handleRemoveFromQueue}
              />
            )}
            {selectedTrack.albumId && (
              <ActionRow
                icon={<Disc size={20} color={colors.text} />}
                label="Go to album"
                onPress={handleGoToAlbum}
              />
            )}
            {selectedTrack.artistId && (
              <ActionRow
                icon={<User size={20} color={colors.text} />}
                label="Go to artist"
                onPress={handleGoToArtist}
              />
            )}
            <ActionRow
              icon={<Info size={18} color={colors.text} />}
              label="View song credits"
              onPress={handleCreditsPress}
            />
            <ActionRow
              icon={<Share2 size={18} color={colors.text} />}
              label="Share"
              onPress={handleShare}
            />
            {isCurrentTrackActive && (
              <ActionRow
                icon={<BarChart2 size={20} color={colors.text} />}
                label="Stats for nerds"
                onPress={() => setSheetScreen('stats')}
              />
            )}
            {isCurrentTrackActive && (
              <ActionRow
                icon={<ListX size={20} color={colors.text} />}
                label="Dismiss queue"
                onPress={handleDismissQueue}
                last
              />
            )}
          </>
        )}

        {selectedItem.type === 'album' && (
          <>
            <ActionRow
              icon={<ListVideo size={20} color={colors.text} />}
              label="Play next"
              onPress={handlePlayNextCollection}
            />
            <ActionRow
              icon={<ListPlus size={20} color={colors.text} />}
              label="Add to queue"
              onPress={handleAddToQueueCollection}
            />
            <ActionRow
              icon={<ThumbsUp fill={colors.text} size={18} color={colors.text} />}
              label="Save album to library"
              onPress={handleSaveAlbumToLibrary}
            />
            <ActionRow
              icon={<Download size={18} color={colors.text} />}
              label="Download all tracks"
              onPress={handleDownloadCollection}
            />
            <ActionRow
              icon={<FolderPlus size={18} color={colors.text} />}
              label="Save to playlist"
              onPress={() => setSheetScreen('playlists')}
            />
            {selectedItem.artistId && (
              <ActionRow
                icon={<User size={18} color={colors.text} />}
                label="Go to artist"
                onPress={handleGoToArtistFromCollection}
              />
            )}
            <ActionRow
              icon={<Share2 size={18} color={colors.text} />}
              label="Share album"
              onPress={handleShareCollection}
            />
          </>
        )}

        {selectedItem.type === 'playlist' && (
          <>
            <ActionRow
              icon={<ListVideo size={20} color={colors.text} />}
              label="Play next"
              onPress={handlePlayNextCollection}
            />
            <ActionRow
              icon={<ListPlus size={20} color={colors.text} />}
              label="Add to queue"
              onPress={handleAddToQueueCollection}
            />
            <ActionRow
              icon={<Download size={18} color={colors.text} />}
              label="Download all tracks"
              onPress={handleDownloadCollection}
            />
            <ActionRow
              icon={<Share2 size={18} color={colors.text} />}
              label="Share playlist"
              onPress={handleShareCollection}
            />
            {selectedItem.id.startsWith('local-') && (
              <ActionRow
                icon={<Trash2 size={18} color="#FF3B30" />}
                label="Delete playlist"
                onPress={() => {
                  setDeleteAlertVisible(true);
                }}
                color="#FF3B30"
              />
            )}
          </>
        )}

        {selectedItem.type === 'artist' && (
          <>
            <ActionRow
              icon={<User size={18} color={colors.text} />}
              label="Go to artist page"
              onPress={() => {
                state.setVisible(false);
                DeviceEventEmitter.emit('collapse-player-modal');
                state.router.push(`/artist/${selectedItem.id}` as any);
              }}
            />
            <ActionRow
              icon={<Shuffle size={18} color={colors.text} />}
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
              icon={<Share2 size={18} color={colors.text} />}
              label="Share artist"
              onPress={handleShareCollection}
            />
          </>
        )}

        <ActionRow
          icon={<Pin size={20} color={state.isTrackPinned(selectedItem.id) ? colors.primary : colors.text} fill={state.isTrackPinned(selectedItem.id) ? colors.primary : 'none'} />}
          label={state.isTrackPinned(selectedItem.id) ? "Unpin from Speed Dial" : "Pin to Speed Dial"}
          onPress={state.handlePinListenAgain}
          last
        />
      </BottomSheetScrollView>

      <Alert
        visible={deleteAlertVisible}
        onClose={() => setDeleteAlertVisible(false)}
        title="Delete Playlist"
        description={`Are you sure you want to delete "${selectedItem.title}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          await deletePlaylist(selectedItem.id);
          setDeleteAlertVisible(false);
          state.setVisible(false);
        }}
        variant="destructive"
      />
    </View>
  );
}
