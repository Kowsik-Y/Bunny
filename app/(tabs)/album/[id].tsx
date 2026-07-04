import { SongCard } from '@/components/cards';
import { PlaylistHeader } from '@/components/HeaderCard/PlaylistHeader';
import { type AppTrack } from '@/components/player/Tracks';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Muted } from '@/components/ui/typography';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { toast, useCurrentTrack, useDownloads, usePlayerState } from '@/services';
import { PlayerActions } from '@/services/SetupService';
import { getAlbumDetails } from '@/services/ytMusic';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';





export default function AlbumScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { startDownload } = useDownloads();
  const currentTrack = useCurrentTrack();
  const { isPlaying } = usePlayerState();
  const [albumData, setAlbumData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const bottomSpacing = useBottomTabSpacing();

  useEffect(() => {
    if (id) {
      loadAlbum();
    }
  }, [id]);

  const loadAlbum = async () => {
    try {
      setLoading(true);
      const data = await getAlbumDetails(id as string);
      setAlbumData(data);
    } catch (e) {
      console.error('Album load error', e);
    } finally {
      setLoading(false);
    }
  };

  const renderTrackItem = ({ item, index }: { item: any; index: number }) => {
    const trackId = item.videoId || item.id;
    const isActive = !!(currentTrack?.id === trackId || (currentTrack?.id && currentTrack.id.includes(trackId)));
    return (
      <SongCard
        title={item.name}
        artist={typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name || 'Unknown Artist'}
        index={index}
        showIndex={true}
        rightIcon="play"
        isActive={isActive}
        isPlaying={isPlaying}
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
        onTogglePress={() => PlayerActions.playPause(isPlaying)}
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
      PlayerActions.playPause(isPlaying);
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

  const handleHeartPress = () => {
    // Like logic if needed
  };

  const handleDownloadPress = async () => {
    if (!albumData.tracks || albumData.tracks.length === 0) {
      toast.info('This album has no tracks.');
      return;
    }

    toast.info(`Queued ${albumData.tracks.length} tracks for download.`);

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
      startDownload(track);
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
        data={albumData.tracks || []}
        keyExtractor={(item, index) => item.videoId || String(index)}
        renderItem={renderTrackItem}
        ListHeaderComponent={
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
            subtitle={`Album • ${albumData.tracks?.length || 0} tracks • ${albumData.year || 'Unknown'}`}
            isPlaying={isAlbumActive && isPlaying}
            onPlayPress={handlePlayPress}
            onShufflePress={handleShufflePress}
            onHeartPress={handleHeartPress}
            onDownloadPress={handleDownloadPress}
          />
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
    paddingTop: 80,
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
