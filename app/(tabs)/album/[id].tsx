import { SongCard } from '@/components/cards';
import { PlaylistHeader } from '@/components/HeaderCard/PlaylistHeader';
import { type AppTrack } from '@/components/player/Tracks';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Muted } from '@/components/ui/typography';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { toast, useCurrentTrack, useDownloads, usePlayerState, useFavorites } from '@/services';
import { PlayerActions } from '@/services/SetupService';
import { getLocalPlaylists, createLocalPlaylist, addTrackToLocalPlaylist } from '@/services/playlists/storage';
import { getAlbumDetails } from '@/services/ytMusic';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Share } from 'react-native';
import { useTrackOptions } from '@/contexts/track-options-context';
import { SafeAreaView } from 'react-native-safe-area-context';





export default function AlbumScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { startDownload, isDownloaded, downloadingIds } = useDownloads();
  const currentTrack = useCurrentTrack();
  const { toggleFavorite } = useFavorites();
  const { openAlbumOptions } = useTrackOptions();
  const { isPlaying, isBuffering } = usePlayerState();
  const [albumData, setAlbumData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const bottomSpacing = useBottomTabSpacing();
  const listRef = useRef<FlatList>(null);

  const loadAlbum = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAlbumDetails(id as string);
      setAlbumData(data);
    } catch (e) {
      console.error('Album load error', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
      Promise.resolve().then(() => {
        loadAlbum();
      });
    }
  }, [id, loadAlbum]);

  const renderTrackItem = ({ item, index }: { item: any; index: number }) => {
    const trackId = item.videoId || item.id;
    const isActive = !!(currentTrack && (
      currentTrack.id === trackId ||
      (currentTrack.id && currentTrack.id.includes(trackId)) ||
      (trackId && trackId.includes(currentTrack.id))
    ));
    return (
      <SongCard
        title={item.name}
        artist={typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist'}
        index={index}
        showIndex={true}
        rightIcon="play"
        isActive={isActive}
        isPlaying={isPlaying || isBuffering}
        onPress={() => PlayerActions.skipToTrackFromYt({
          id: item.videoId,
          title: item.name,
          artist: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist',
          album: albumData.name,
          thumbnail: albumData.thumbnails?.[0]?.url,
          url: `https://music.youtube.com/watch?v=${item.videoId}`,
          duration: item.duration / 1000,
          type: 'song',
          artistId: albumData.artistId,
          albumId: id as string,
          artists: albumData.artistId ? [{ name: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist', id: albumData.artistId }] : undefined,
        })}
        onTogglePress={() => PlayerActions.playPause(isPlaying || isBuffering)}
        track={{
          id: item.videoId,
          title: item.name,
          artist: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist',
          album: albumData.name,
          artwork: albumData.thumbnails?.[0]?.url || '',
          url: `https://music.youtube.com/watch?v=${item.videoId}`,
          duration: item.duration / 1000,
          artistId: albumData.artistId,
          albumId: id as string,
          artists: albumData.artistId ? [{ name: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist', id: albumData.artistId }] : undefined,
        }}
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

  if (!albumData) {
    return (
      <ThemedView style={[styles.screen, styles.center]}>
        <Muted>Album not found</Muted>
        <Button label="Go Back" onPress={() => router.back()} style={{ marginTop: 20 }} />
      </ThemedView>
    );
  }

  // Is a track from this album currently active?
  const albumTrackIds = (albumData.tracks || []).map((t: any) => t.videoId || t.id);
  const isAlbumActive = albumTrackIds.some(
    (tid: string) => currentTrack?.id === tid || (currentTrack?.id && currentTrack.id.includes(tid))
  );

  const handlePlayPress = () => {
    if (isAlbumActive) {
      PlayerActions.playPause(isPlaying || isBuffering);
      return;
    }
    if (albumData.tracks?.[0]) {
      PlayerActions.skipToTrackFromYt({
        id: albumData.tracks[0].videoId,
        title: albumData.tracks[0].name,
        artist: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name,
        album: albumData.name,
        thumbnail: albumData.thumbnails?.[0]?.url,
        url: `https://music.youtube.com/watch?v=${albumData.tracks[0].videoId}`,
        duration: albumData.tracks[0].duration / 1000,
        type: 'song',
        artistId: albumData.artistId,
        albumId: id as string,
        artists: albumData.artistId ? [{ name: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist', id: albumData.artistId }] : undefined,
      });
    }
  };

  const handleShufflePress = () => {
    // Shuffle logic if needed
  };

  const handleHeartPress = async () => {
    toast.info('Saving album tracks to library...');
    let likedCount = 0;
    for (const item of albumData.tracks || []) {
      const track: AppTrack = {
        id: item.videoId,
        title: item.name,
        artist: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist',
        album: albumData.name,
        artwork: albumData.thumbnails?.[0]?.url || '',
        url: `https://music.youtube.com/watch?v=${item.videoId}`,
        duration: item.duration / 1000,
        artistId: albumData.artistId,
        albumId: id as string,
      };
      await toggleFavorite(track);
      likedCount++;
    }
    toast.success(`Updated ${likedCount} tracks in library`);
  };

  const handleSharePress = async () => {
    try {
      await Share.share({
        message: `Check out this album "${albumData.name}": https://music.youtube.com/playlist?list=${id}`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSavePlaylistPress = () => {
    openAlbumOptions({
      id: id as string,
      title: albumData.name,
      artist: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist',
      artwork: albumData.thumbnails?.[0]?.url,
      artistId: albumData.artistId,
    });
  };

  const handleGoToArtistPress = () => {
    if (albumData.artistId) {
      router.push(`/artist/${albumData.artistId}`);
    }
  };

  const handleDownloadPress = async () => {
    if (!albumData.tracks || albumData.tracks.length === 0) {
      toast.info('This album has no tracks.');
      return;
    }

    toast.info(`Queued ${albumData.tracks.length} tracks for download.`);

    try {
      const playlists = await getLocalPlaylists();
      let playlist = playlists.find(p => p.name.toLowerCase() === albumData.name.toLowerCase());
      if (!playlist) {
        playlist = await createLocalPlaylist(albumData.name);
      }

      for (const item of albumData.tracks) {
        const track: AppTrack = {
          id: item.videoId,
          title: item.name,
          artist: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist',
          album: albumData.name,
          artwork: albumData.thumbnails?.[0]?.url || '',
          url: `https://music.youtube.com/watch?v=${item.videoId}`,
          duration: item.duration / 1000,
          artistId: albumData.artistId,
          albumId: id as string,
          artists: albumData.artistId ? [{ name: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist', id: albumData.artistId }] : undefined,
        };
        const ok = await startDownload(track);
        if (ok && playlist) {
          await addTrackToLocalPlaylist(playlist.id, track);
        }
      }
    } catch (e) {
      console.warn('Album download error', e);
      toast.error('Failed to start album downloads');
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
        data={albumData.tracks || []}
        keyExtractor={(item, index) => item.videoId || String(index)}
        renderItem={renderTrackItem}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListHeaderComponent={
          (() => {
            const totalDuration = (albumData.tracks || []).reduce((acc: number, t: any) => acc + (t.duration / 1000 || 0), 0);
            const durationMin = Math.floor(totalDuration / 60);
            const subtitle = `Album • ${albumData.tracks?.length || 0} tracks • ${durationMin > 0 ? `${durationMin} min • ` : ''}${albumData.year || 'Unknown'}`;

            const albumTracks = albumData.tracks || [];
            const totalTracksCount = albumTracks.length;
            const downloadedTracksCount = albumTracks.filter((t: any) => isDownloaded(t.videoId || t.id)).length;
            const isAllDownloaded = totalTracksCount > 0 && downloadedTracksCount === totalTracksCount;

            const downloadingTracksList = albumTracks.filter((t: any) => downloadingIds[t.videoId || t.id] !== undefined);
            const isDownloading = downloadingTracksList.length > 0;

            let overallProgress = 0;
            if (totalTracksCount > 0) {
              const sumProgress = albumTracks.reduce((sum: number, t: any) => {
                const trackId = t.videoId || t.id;
                if (isDownloaded(trackId)) return sum + 1;
                const prog = downloadingIds[trackId];
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
                name={albumData.name}
                artworkUrl={albumData.thumbnails?.[albumData.thumbnails.length - 1]?.url}
                artistName={typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name}
                onArtistPress={() => {
                  if (albumData.artistId) {
                    router.push(`/artist/${albumData.artistId}`);
                  } else {
                    router.push({ pathname: '/(tabs)/explore', params: { query: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name } } as any);
                  }
                }}
                subtitle={subtitle}
                isPlaying={isAlbumActive && (isPlaying || isBuffering)}
                onPlayPress={handlePlayPress}
                onShufflePress={handleShufflePress}
                onHeartPress={handleHeartPress}
                onDownloadPress={handleDownloadPress}
                onSharePress={handleSharePress}
                onSavePlaylistPress={handleSavePlaylistPress}
                onGoToArtistPress={albumData.artistId ? handleGoToArtistPress : undefined}
                downloadStatus={downloadStatus}
                downloadProgress={overallProgress}
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
