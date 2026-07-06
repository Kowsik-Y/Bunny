import { SongCard } from '@/components/cards';
import { PlaylistHeader } from '@/components/HeaderCard/PlaylistHeader';
import tracks, { AppTrack } from '@/components/player/Tracks';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { PlayerActions, toast, useCurrentTrack, useDownloads, useFavorites, usePlayerState, usePlaylists } from '@/services';
import { getLocalPlaylists } from '@/services/playlists';
import { getPlaylistDetails, searchYtMusic } from '@/services/ytMusic';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTrackOptions } from '@/contexts/track-options-context';



export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { favorites } = useFavorites();
  const { startDownload, isDownloaded, downloadingIds, pausedDownloadingIds, pauseDownload, cancelDownload } = useDownloads();
  const currentTrack = useCurrentTrack();
  const { openPlaylistOptions } = useTrackOptions();
  const { isPlaying, isBuffering } = usePlayerState();
  const { playlists, createPlaylist, addTrackToPlaylist } = usePlaylists();
  const bottomSpacing = useBottomTabSpacing();

  const [playlistName, setPlaylistName] = useState<string>(typeof id === 'string' ? id : 'Playlist');
  const [playlistTracks, setPlaylistTracks] = useState<AppTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  const isAddedToLibrary = playlists.some(
    (p) => p.name.toLowerCase() === playlistName.toLowerCase()
  );

  const handleAddToLibrary = async () => {
    if (isAddedToLibrary) return;
    toast.info('Saving playlist to library...');
    try {
      let playlist = playlists.find(p => p.name.toLowerCase() === playlistName.toLowerCase());
      if (!playlist) {
        playlist = await createPlaylist(playlistName);
      }
      if (playlist && playlistTracks.length > 0) {
        for (const track of playlistTracks) {
          await addTrackToPlaylist(playlist.id, track);
        }
        toast.success('Saved to library locally');
      }
    } catch (e) {
      console.warn('Failed to add playlist to library', e);
      toast.error('Failed to add playlist to library');
    }
  };

  const loadPlaylistDetails = useCallback(async () => {
    try {
      setLoading(true);
      const isLocal = typeof id === 'string' && id.startsWith('local-');
      const isCategory = ['Chill', 'Workout', 'Focus', 'Party', 'Sleep', 'Romance', 'Travel', 'Gaming'].includes(id as string);

      if (isLocal) {
        const localPlaylists = await getLocalPlaylists();
        const local = localPlaylists.find((p) => p.id === id);
        if (local) {
          setPlaylistName(local.name);
          setPlaylistTracks(local.tracks);
          setArtworkUrl(local.tracks.length > 0 ? local.tracks[0].artwork : null);
        } else {
          setPlaylistName('Playlist Not Found');
          setPlaylistTracks([]);
        }
      } else if (isCategory) {
        const searchRes = await searchYtMusic(id as string);
        if (searchRes.songs && searchRes.songs.length > 0) {
          const tracksData = searchRes.songs.map((s: any) => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album || 'Single',
            artwork: s.thumbnail || '',
            duration: s.duration || 0,
            url: s.url || `https://music.youtube.com/watch?v=${s.id}`,
            artistId: s.artistId,
            albumId: s.albumId,
          }));
          setPlaylistTracks(tracksData);
          setPlaylistName(id as string);
          if (tracksData.length > 0) {
            setArtworkUrl(tracksData[0].artwork);
          }
        } else {
          setPlaylistTracks(tracks.slice(0, 4));
          setPlaylistName(id as string);
        }
      } else {
        const data = await getPlaylistDetails(id as string);
        setPlaylistName(data.name || 'Playlist');
        setPlaylistTracks(data.tracks || []);
        setArtworkUrl(data.thumbnailUrl || null);
      }
    } catch (e) {
      console.error('Playlist load error', e);
      setPlaylistName(typeof id === 'string' ? id : 'Playlist');
      setPlaylistTracks(tracks.slice(0, 4));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
    if (id === 'liked') {
      Promise.resolve().then(() => {
        setPlaylistName('Liked Music');
        setPlaylistTracks(favorites);
        setArtworkUrl(favorites.length > 0 ? favorites[0].artwork : null);
        setLoading(false);
      });
    } else if (id) {
      Promise.resolve().then(() => {
        loadPlaylistDetails();
      });
    }
  }, [id, favorites, loadPlaylistDetails]);

  const totalDuration = playlistTracks.reduce((acc, t) => acc + (t.duration || 0), 0);

  const handleSharePress = async () => {
    try {
      await Share.share({
        message: `Check out this playlist "${playlistName}": https://music.youtube.com/playlist?list=${id}`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSavePlaylistPress = () => {
    openPlaylistOptions({
      id: id as string,
      name: playlistName,
      songCount: playlistTracks.length,
      artwork: artworkUrl || undefined,
    });
  };

  const renderTrackItem = ({ item, index }: { item: AppTrack; index: number }) => {
    const trackId = item.id;
    const isActive = !!(currentTrack && (
      currentTrack.id === trackId ||
      (currentTrack.id && currentTrack.id.includes(trackId)) ||
      (trackId && trackId.includes(currentTrack.id))
    ));
    return (
      <SongCard
        title={item.title}
        artist={item.artist}
        album={item.album}
        artwork={item.artwork}
        rightIcon="play"
        isActive={isActive}
        isPlaying={isPlaying || isBuffering}
        index={index}
        showRank={true}
        onPress={() => PlayerActions.skipToTrackFromYt({
          id: item.id,
          title: item.title,
          artist: item.artist,
          album: item.album,
          thumbnail: item.artwork,
          url: item.url?.toString() || `https://music.youtube.com/watch?v=${item.id}`,
          duration: item.duration,
          type: 'song',
          artistId: item.artistId,
          albumId: item.albumId,
        })}
        onTogglePress={() => PlayerActions.playPause(isPlaying || isBuffering)}
        track={item}
      />
    );
  };

  if (loading) {
    return (
      <ThemedView style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  // Determine if a track from this playlist is currently active
  const isPlaylistActive = playlistTracks.some(
    (t) => currentTrack?.id === t.id || (currentTrack?.id && currentTrack.id.includes(t.id))
  );

  const handlePlayPress = async () => {
    // If this playlist is already active, just toggle play/pause
    if (isPlaylistActive) {
      PlayerActions.playPause(isPlaying || isBuffering);
      return;
    }
    if (playlistTracks.length > 0) {
      await PlayerActions.playCollection(playlistTracks);
    }
  };

  const handleShufflePress = async () => {
    if (playlistTracks.length > 0) {
      const shuffled = [...playlistTracks].sort(() => Math.random() - 0.5);
      await PlayerActions.playCollection(shuffled);
    }
  };

  const handlePauseDownloads = async () => {
    const tracksToPause = playlistTracks.filter((t) => downloadingIds[t.id] !== undefined);
    const alreadyPausedCount = tracksToPause.filter((t) => pausedDownloadingIds[t.id]).length;
    const shouldResume = alreadyPausedCount === tracksToPause.length;

    if (shouldResume) {
      toast.info('Resuming downloads...');
      for (const track of tracksToPause) {
        await startDownload(track);
      }
    } else {
      toast.info('Pausing downloads...');
      for (const track of tracksToPause) {
        await pauseDownload(track.id);
      }
    }
  };

  const handleCancelDownloads = async () => {
    toast.info('Cancelling downloads...');
    const tracksToCancel = playlistTracks.filter((t) => downloadingIds[t.id] !== undefined);
    for (const track of tracksToCancel) {
      await cancelDownload(track.id);
    }
  };

  const handleDownloadPress = async () => {
    if (playlistTracks.length === 0) {
      toast.info('This playlist has no tracks.');
      return;
    }

    if (!isAddedToLibrary) {
      await handleAddToLibrary();
    }

    toast.info(`Downloading ${playlistTracks.length} tracks...`);

    try {
      let success = 0;
      for (const track of playlistTracks) {
        const ok = await startDownload(track);
        if (ok) {
          success++;
        }
      }
      toast.success(`Queued ${success}/${playlistTracks.length} downloads`);
    } catch (e) {
      console.warn('Playlist download error', e);
      toast.error('Failed to start playlist downloads');
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.stickyBackContainer} pointerEvents="box-none">
        <Button
          style={{
            padding: 5,
            borderRadius: 50,
            backgroundColor: addAlpha(colors.background, 0.85),
            borderColor: colors.border,
            borderWidth: 0.8,
            alignSelf: 'flex-start',
            pointerEvents: 'auto',
          }}
          onPress={() => router.back()}
          variant="secondary" size="icon">
          <ChevronLeft size={20} color={colors.primary} />
        </Button>
      </SafeAreaView>

      <FlatList
        ref={listRef}
        data={playlistTracks}
        keyExtractor={(item, index) => item.id + '-' + index}
        renderItem={renderTrackItem}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={
          (() => {
            const durationMin = Math.floor(totalDuration / 60);
            const subtitle = `Playlist • ${playlistTracks.length} tracks${durationMin > 0 ? ` • ${durationMin} min` : ''}`;

            const totalTracksCount = playlistTracks.length;
            const downloadedTracksCount = playlistTracks.filter(t => isDownloaded(t.id)).length;
            const isAllDownloaded = totalTracksCount > 0 && downloadedTracksCount === totalTracksCount;

            const downloadingTracksList = playlistTracks.filter(t => downloadingIds[t.id] !== undefined);
            const isDownloading = downloadingTracksList.length > 0;

            let overallProgress = 0;
            if (totalTracksCount > 0) {
              const sumProgress = playlistTracks.reduce((sum, t) => {
                if (isDownloaded(t.id)) return sum + 1;
                const prog = downloadingIds[t.id];
                return sum + (prog !== undefined ? prog : 0);
              }, 0);
              overallProgress = sumProgress / totalTracksCount;
            }

            const downloadStatus = isAllDownloaded
              ? 'downloaded'
              : isDownloading
                ? 'downloading'
                : 'default';

            return (
              <PlaylistHeader
                name={playlistName}
                tracks={playlistTracks}
                artworkUrl={artworkUrl}
                totalDuration={totalDuration}
                subtitle={subtitle}
                isPlaying={isPlaylistActive && (isPlaying || isBuffering)}
                onPlayPress={handlePlayPress}
                onShufflePress={handleShufflePress}
                onAddToLibraryPress={id !== 'liked' ? handleAddToLibrary : undefined}
                isAddedToLibrary={isAddedToLibrary}
                onDownloadPress={handleDownloadPress}
                isLikedMusic={id === 'liked'}
                onSharePress={handleSharePress}
                onSavePlaylistPress={id !== 'liked' ? handleSavePlaylistPress : undefined}
                downloadStatus={downloadStatus}
                downloadProgress={overallProgress}
                onPauseDownloadsPress={handlePauseDownloads}
                onCancelDownloadsPress={handleCancelDownloads}
                isDownloadsPaused={isDownloading && downloadingTracksList.every(t => pausedDownloadingIds[t.id])}
              />
            );
          })()
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Top Fade Gradient */}
      <LinearGradient
        colors={[
          colors.background,
          addAlpha(colors.background, 0.9),
          addAlpha(colors.background, 0.6),
          addAlpha(colors.background, 0.3),
          addAlpha(colors.background, 0.1),
          'transparent'
        ]}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Bottom Fade Gradient */}
      <LinearGradient
        colors={[
          'transparent',
          addAlpha(colors.background, 0.1),
          addAlpha(colors.background, 0.3),
          addAlpha(colors.background, 0.6),
          addAlpha(colors.background, 0.9),
          colors.background
        ]}
        style={[styles.bottomGradient, { height: bottomSpacing + 25 }]}
        pointerEvents="none"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 180,
  },
  stickyBackContainer: {
    position: 'absolute',
    top: 20,
    left: 15,
    zIndex: 100,
    right: 0,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 10,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
