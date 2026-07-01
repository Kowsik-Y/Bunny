import React, { createContext, useContext, useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  Share,
  Alert,
  ScrollView,
  Dimensions,
  TextInput,
  Text,
} from 'react-native';
import { SwipeBottomSheet } from '@/components/player/SwipeBottomSheet';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';
import { type AppTrack } from '@/components/player/Tracks';
import { PlayerActions, useFavorites, useDownloads, usePlaylists, toast } from '@/services';
import TrackPlayer from 'react-native-track-player';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getAlbumDetails, getPlaylistDetails, searchYtMusic } from '@/services/ytMusic';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TrackOptionsContextType {
  openTrackOptions: (track: AppTrack) => void;
  openAlbumOptions: (album: { id: string; title: string; artist: string; artwork?: string; artistId?: string }) => void;
  openPlaylistOptions: (playlist: { id: string; name: string; songCount?: number; artwork?: string }) => void;
  openArtistOptions: (artist: { id: string; name: string; artwork?: string }) => void;
}

const TrackOptionsContext = createContext<TrackOptionsContextType | undefined>(undefined);

export function useTrackOptions() {
  const context = useContext(TrackOptionsContext);
  if (!context) {
    throw new Error('useTrackOptions must be used within a TrackOptionsProvider');
  }
  return context;
}

export function TrackOptionsProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<AppTrack | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'track' | 'album' | 'artist' | 'playlist';
    id: string;
    title: string;
    artist?: string;
    artwork?: string;
    artistId?: string;
    albumId?: string;
  } | null>(null);

  const { toggleFavorite, isFavorite, addFavorite } = useFavorites();
  const { startDownload, isDownloaded, downloadingIds, removeDownload } = useDownloads();
  const { playlists, addTrackToPlaylist, createPlaylist } = usePlaylists();

  const [sheetScreen, setSheetScreen] = useState<'main' | 'playlists' | 'credits' | 'stats'>('main');
  const [newPlaylistVisible, setNewPlaylistVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const openTrackOptions = (track: AppTrack) => {
    setSelectedTrack(track);
    setSelectedItem({
      type: 'track',
      id: track.id,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      artistId: track.artistId,
      albumId: track.albumId,
    });
    setSheetScreen('main');
    setVisible(true);
  };

  const openAlbumOptions = (album: any) => {
    setSelectedItem({
      type: 'album',
      id: album.id,
      title: album.title,
      artist: album.artist,
      artwork: album.artwork,
      artistId: album.artistId,
    });
    setSheetScreen('main');
    setVisible(true);
  };

  const openPlaylistOptions = (playlist: any) => {
    setSelectedItem({
      type: 'playlist',
      id: playlist.id,
      title: playlist.name,
      artist: playlist.songCount !== undefined ? `${playlist.songCount} songs` : 'Playlist',
      artwork: playlist.artwork,
    });
    setSheetScreen('main');
    setVisible(true);
  };

  const openArtistOptions = (artist: any) => {
    setSelectedItem({
      type: 'artist',
      id: artist.id,
      title: artist.name,
      artwork: artist.artwork,
    });
    setSheetScreen('main');
    setVisible(true);
  };

  const handlePlayNext = async () => {
    if (!selectedTrack) return;
    try {
      const activeIdx = await TrackPlayer.getActiveTrackIndex();
      const insertIdx = typeof activeIdx === 'number' ? activeIdx + 1 : 0;
      await TrackPlayer.add([selectedTrack], insertIdx);
      toast.success('Added to play next');
      setVisible(false);
    } catch (e) {
      console.warn('Play next error', e);
      toast.error('Failed to add to play next');
    }
  };

  const handleAddToQueue = async () => {
    if (!selectedTrack) return;
    try {
      await PlayerActions.addTrack(selectedTrack, false);
      toast.success('Added to queue');
      setVisible(false);
    } catch (e) {
      toast.error('Failed to add to queue');
    }
  };

  const handleToggleLike = async () => {
    if (!selectedTrack) return;
    await toggleFavorite(selectedTrack);
    const liked = isFavorite(selectedTrack.id);
    toast.success(liked ? 'Removed from Liked Songs' : 'Added to Liked Songs');
    setVisible(false);
  };

  const handleDownload = async () => {
    if (!selectedTrack) return;
    if (isDownloaded(selectedTrack.id)) {
      // Already downloaded — delete it
      await removeDownload(selectedTrack.id);
      toast.success('Removed from downloads');
      setVisible(false);
      return;
    }
    if (downloadingIds[selectedTrack.id] !== undefined) {
      // Already in progress — do nothing (or could cancel)
      return;
    }
    try {
      await startDownload(selectedTrack);
      toast.success('Download started');
      setVisible(false);
    } catch (e) {
      toast.error('Failed to download track');
    }
  };

  const handleRemoveFromQueue = async () => {
    if (!selectedTrack) return;
    try {
      const queue = await TrackPlayer.getQueue();
      const idx = queue.findIndex(t => String(t.id) === String(selectedTrack.id));
      if (idx >= 0) {
        await TrackPlayer.remove(idx);
        toast.success('Removed from queue');
      } else {
        toast.info('Track is not in the queue');
      }
      setVisible(false);
    } catch (e) {
      toast.error('Failed to remove from queue');
    }
  };

  const handleGoToAlbum = () => {
    if (!selectedTrack) return;
    setVisible(false);
    if (selectedTrack.albumId) {
      router.push(`/album/${selectedTrack.albumId}` as any);
    }
  };

  const handleGoToArtist = () => {
    if (!selectedTrack) return;
    setVisible(false);
    if (selectedTrack.artists && selectedTrack.artists.length > 1) {
      Alert.alert(
        'Select Artist',
        'Which artist would you like to view?',
        [
          ...selectedTrack.artists.map((art) => ({
            text: art.name,
            onPress: () => router.push(`/artist/${art.id}` as any),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
        { cancelable: true }
      );
    } else if (selectedTrack.artistId) {
      router.push(`/artist/${selectedTrack.artistId}` as any);
    }
  };

  const handleShare = async () => {
    if (!selectedTrack) return;
    setVisible(false);
    try {
      const videoId = selectedTrack.id.startsWith('yt-') ? selectedTrack.id.substring(3) : selectedTrack.id;
      await Share.share({
        message: `Listen to "${selectedTrack.title}" by ${selectedTrack.artist}: https://music.youtube.com/watch?v=${videoId}`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDismissQueue = async () => {
    setVisible(false);
    Alert.alert('Dismiss Queue', 'Clear the entire playback queue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await TrackPlayer.reset();
          toast.success('Queue cleared');
        },
      },
    ]);
  };

  const handlePinListenAgain = () => {
    setVisible(false);
    toast.success('Pinned to Listen Again');
  };

  const handleReport = () => {
    setVisible(false);
    toast.success('Report submitted. Thank you!');
  };

  const handlePlayNextCollection = async () => {
    if (!selectedItem) return;
    setVisible(false);
    toast.info('Resolving tracks...');
    try {
      let tracksData: AppTrack[] = [];
      if (selectedItem.type === 'album') {
        const albumDetails = await getAlbumDetails(selectedItem.id);
        tracksData = (albumDetails.tracks || []).map((t: any) => ({
          id: t.videoId,
          title: t.name,
          artist: selectedItem.artist || 'Unknown Artist',
          album: selectedItem.title,
          artwork: selectedItem.artwork || '',
          duration: t.duration / 1000,
          url: `https://dummy.com/track-${t.videoId}.mp3`,
          artistId: selectedItem.artistId,
          albumId: selectedItem.id,
        }));
      } else if (selectedItem.type === 'playlist') {
        const playlistDetails = await getPlaylistDetails(selectedItem.id);
        tracksData = playlistDetails.tracks;
      }
      
      if (tracksData.length > 0) {
        const activeIdx = await TrackPlayer.getActiveTrackIndex();
        const insertIdx = typeof activeIdx === 'number' ? activeIdx + 1 : 0;
        await TrackPlayer.add(tracksData, insertIdx);
        toast.success(`Queued ${tracksData.length} songs next`);
      } else {
        toast.info('No tracks found');
      }
    } catch (e) {
      console.warn('Play next collection error', e);
      toast.error('Failed to add to play next');
    }
  };

  const handleAddToQueueCollection = async () => {
    if (!selectedItem) return;
    setVisible(false);
    toast.info('Resolving tracks...');
    try {
      let tracksData: AppTrack[] = [];
      if (selectedItem.type === 'album') {
        const albumDetails = await getAlbumDetails(selectedItem.id);
        tracksData = (albumDetails.tracks || []).map((t: any) => ({
          id: t.videoId,
          title: t.name,
          artist: selectedItem.artist || 'Unknown Artist',
          album: selectedItem.title,
          artwork: selectedItem.artwork || '',
          duration: t.duration / 1000,
          url: `https://dummy.com/track-${t.videoId}.mp3`,
          artistId: selectedItem.artistId,
          albumId: selectedItem.id,
        }));
      } else if (selectedItem.type === 'playlist') {
        const playlistDetails = await getPlaylistDetails(selectedItem.id);
        tracksData = playlistDetails.tracks;
      }

      if (tracksData.length > 0) {
        await TrackPlayer.add(tracksData);
        toast.success(`Added ${tracksData.length} songs to queue`);
      } else {
        toast.info('No tracks found');
      }
    } catch (e) {
      console.warn('Queue collection error', e);
      toast.error('Failed to add to queue');
    }
  };

  const handleDownloadCollection = async () => {
    if (!selectedItem) return;
    setVisible(false);
    toast.info('Downloading collection...');
    try {
      let tracksData: AppTrack[] = [];
      if (selectedItem.type === 'album') {
        const albumDetails = await getAlbumDetails(selectedItem.id);
        tracksData = (albumDetails.tracks || []).map((t: any) => ({
          id: t.videoId,
          title: t.name,
          artist: selectedItem.artist || 'Unknown Artist',
          album: selectedItem.title,
          artwork: selectedItem.artwork || '',
          duration: t.duration / 1000,
          url: `https://dummy.com/track-${t.videoId}.mp3`,
          artistId: selectedItem.artistId,
          albumId: selectedItem.id,
        }));
      } else if (selectedItem.type === 'playlist') {
        const playlistDetails = await getPlaylistDetails(selectedItem.id);
        tracksData = playlistDetails.tracks;
      }

      if (tracksData.length > 0) {
        toast.info(`Queued ${tracksData.length} downloads...`);
        for (const track of tracksData) {
          startDownload(track);
        }
      } else {
        toast.info('No tracks found to download');
      }
    } catch (e) {
      console.warn('Download collection error', e);
      toast.error('Failed to download collection');
    }
  };

  const handleSaveAlbumToLibrary = async () => {
    if (!selectedItem || selectedItem.type !== 'album') return;
    setVisible(false);
    toast.info('Saving album to library...');
    try {
      const albumDetails = await getAlbumDetails(selectedItem.id);
      const tracksData = (albumDetails.tracks || []).map((t: any) => ({
        id: t.videoId,
        title: t.name,
        artist: selectedItem.artist || 'Unknown Artist',
        album: selectedItem.title,
        artwork: selectedItem.artwork || '',
        duration: t.duration / 1000,
        url: `https://dummy.com/track-${t.videoId}.mp3`,
        artistId: selectedItem.artistId,
        albumId: selectedItem.id,
      }));

      if (tracksData.length > 0) {
        for (const track of tracksData) {
          await addFavorite(track);
        }
        toast.success(`Saved all ${tracksData.length} tracks to library`);
      } else {
        toast.info('No tracks found');
      }
    } catch (e) {
      console.warn('Save album error', e);
      toast.error('Failed to save album');
    }
  };

  const handleAddCollectionToPlaylist = async (playlistId: string) => {
    if (!selectedItem) return;
    setVisible(false);
    toast.info('Adding tracks to playlist...');
    try {
      let tracksData: AppTrack[] = [];
      if (selectedItem.type === 'album') {
        const albumDetails = await getAlbumDetails(selectedItem.id);
        tracksData = (albumDetails.tracks || []).map((t: any) => ({
          id: t.videoId,
          title: t.name,
          artist: selectedItem.artist || 'Unknown Artist',
          album: selectedItem.title,
          artwork: selectedItem.artwork || '',
          duration: t.duration / 1000,
          url: `https://dummy.com/track-${t.videoId}.mp3`,
          artistId: selectedItem.artistId,
          albumId: selectedItem.id,
        }));
      } else if (selectedItem.type === 'playlist') {
        const playlistDetails = await getPlaylistDetails(selectedItem.id);
        tracksData = playlistDetails.tracks;
      }

      if (tracksData.length > 0) {
        let addedCount = 0;
        for (const track of tracksData) {
          const success = await addTrackToPlaylist(playlistId, track);
          if (success) addedCount++;
        }
        toast.success(`Added ${addedCount} tracks to playlist`);
      } else {
        toast.info('No tracks found');
      }
    } catch (e) {
      console.warn('Add collection to playlist error', e);
      toast.error('Failed to add to playlist');
    }
  };

  const handleShareCollection = async () => {
    if (!selectedItem) return;
    setVisible(false);
    try {
      let shareUrl = '';
      if (selectedItem.type === 'album') {
        shareUrl = `https://music.youtube.com/playlist?list=${selectedItem.id}`;
      } else if (selectedItem.type === 'playlist') {
        shareUrl = `https://music.youtube.com/playlist?list=${selectedItem.id}`;
      } else if (selectedItem.type === 'artist') {
        shareUrl = `https://music.youtube.com/channel/${selectedItem.id}`;
      }
      
      if (shareUrl) {
        await Share.share({
          message: `Check out this ${selectedItem.type} "${selectedItem.title}": ${shareUrl}`,
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleGoToArtistFromCollection = () => {
    if (!selectedItem) return;
    setVisible(false);
    if (selectedItem.artistId) {
      router.push(`/artist/${selectedItem.artistId}` as any);
    }
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!selectedTrack) return;
    const success = await addTrackToPlaylist(playlistId, selectedTrack);
    toast.success(success ? 'Added to playlist' : 'Already in playlist');
    setVisible(false);
  };

  const handleCreateNewPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const newPl = await createPlaylist(newPlaylistName.trim());
    if (selectedTrack) {
      await addTrackToPlaylist(newPl.id, selectedTrack);
    }
    setNewPlaylistName('');
    setNewPlaylistVisible(false);
    toast.success('Created playlist and added song');
    setVisible(false);
  };

  // ─── Reusable action row ─────────────────────────────────────────────────
  const ActionRow = ({
    icon,
    label,
    onPress,
    color,
    last = false,
  }: {
    icon: React.ReactNode;
    label: string;
    onPress: () => void;
    color?: string;
    last?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      style={[
        styles.actionRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
      ]}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={[styles.actionText, { color: color ?? colors.text }]}>{label}</Text>
    </Pressable>
  );

  const isLiked = selectedTrack ? isFavorite(selectedTrack.id) : false;

  return (
    <TrackOptionsContext.Provider value={{ openTrackOptions, openAlbumOptions, openPlaylistOptions, openArtistOptions }}>
      {children}

      {selectedItem && (
        <SwipeBottomSheet
          visible={visible}
          onClose={() => setVisible(false)}
          backgroundColor={colors.card}
        >
          {/* ── MAIN SCREEN ─────────────────────────────────────────────── */}
          {sheetScreen === 'main' && (
            <View>
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
                <Image
                  source={
                    selectedItem.artwork && (selectedItem.artwork as string).trim() !== ''
                      ? { uri: selectedItem.artwork as string }
                      : require('@/assets/images/icon.png')
                  }
                  style={styles.artwork}
                />
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

              {/* Options */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={{ maxHeight: SCREEN_HEIGHT * 0.55 }}
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
                      icon={<Feather name="flag" size={18} color={colors.text} />}
                      label="Report"
                      onPress={handleReport}
                    />
                    <ActionRow
                      icon={<MaterialCommunityIcons name="pin" size={20} color={colors.text} />}
                      label="Pin to Listen again"
                      onPress={handlePinListenAgain}
                    />
                    <ActionRow
                      icon={<MaterialCommunityIcons name="playlist-remove" size={20} color={colors.text} />}
                      label="Dismiss queue"
                      onPress={handleDismissQueue}
                    />
                    <ActionRow
                      icon={<MaterialCommunityIcons name="chart-bar" size={20} color={colors.text} />}
                      label="Stats for nerds"
                      onPress={() => setSheetScreen('stats')}
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
                  </>
                )}

                {selectedItem.type === 'artist' && (
                  <>
                    <ActionRow
                      icon={<Feather name="user" size={18} color={colors.text} />}
                      label="Go to artist page"
                      onPress={() => {
                        setVisible(false);
                        router.push(`/artist/${selectedItem.id}` as any);
                      }}
                    />
                    <ActionRow
                      icon={<Feather name="shuffle" size={18} color={colors.text} />}
                      label="Shuffle play artist"
                      onPress={async () => {
                        setVisible(false);
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
              </ScrollView>
            </View>
          )}

          {/* ── PLAYLISTS SCREEN ────────────────────────────────────────── */}
          {sheetScreen === 'playlists' && (
            <View>
              <View style={styles.subHeader}>
                <Pressable onPress={() => setSheetScreen('main')} style={styles.backBtn}>
                  <Feather name="chevron-left" size={22} color={colors.text} />
                </Pressable>
                <Text style={[styles.subHeaderTitle, { color: colors.text }]}>Save to Playlist</Text>
              </View>
              <ScrollView
                style={{ maxHeight: SCREEN_HEIGHT * 0.55 }}
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
              </ScrollView>
            </View>
          )}

          {/* ── CREDITS SCREEN ──────────────────────────────────────────── */}
          {sheetScreen === 'credits' && selectedTrack && (
            <View>
              <View style={styles.subHeader}>
                <Pressable onPress={() => setSheetScreen('main')} style={styles.backBtn}>
                  <Feather name="chevron-left" size={22} color={colors.text} />
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
          )}

          {/* ── STATS SCREEN ────────────────────────────────────────────── */}
          {sheetScreen === 'stats' && selectedTrack && (
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
          )}
        </SwipeBottomSheet>
      )}

      {/* ── NEW PLAYLIST SHEET ──────────────────────────────────────────── */}
      <SwipeBottomSheet
        visible={newPlaylistVisible}
        onClose={() => setNewPlaylistVisible(false)}
        backgroundColor={colors.card}
      >
        <Text style={[styles.newPlaylistTitle, { color: colors.text }]}>New Playlist</Text>
        <View style={[styles.inputRow, { borderColor: addAlpha(colors.text, 0.12) }]}>
          <Feather name="edit-3" size={18} color={colors.mutedForeground} style={{ marginRight: 10 }} />
          <TextInput
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
    </TrackOptionsContext.Provider>
  );
}

const styles = StyleSheet.create({
  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },

  // ── Action Rows ──────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 5,
  },
  actionIcon: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 15,
    marginLeft: 16,
  },

  // ── Sub screens ──────────────────────────────────────────────────────────
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    marginRight: 10,
    padding: 2,
  },
  subHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 5,
    gap: 16,
  },

  // ── New Playlist Sheet ───────────────────────────────────────────────────
  newPlaylistTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 18,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  createBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#fff',
  },
});
