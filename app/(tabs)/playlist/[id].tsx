import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import tracks, { AppTrack } from '@/components/player/Tracks';
import { PlayerActions, useFavorites, useDownloads, toast, useCurrentTrack, usePlayerState } from '@/services';
import { getPlaylistDetails, searchYtMusic } from '@/services/ytMusic';
import { ThemedView } from '@/components/themed-view';
import { SongCard } from '@/components/cards';
import { PlaylistHeader } from '@/components/playlist/PlaylistHeader';
import { getLocalPlaylists } from '@/services/playlists';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { addAlpha } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react-native';



export default function PlaylistScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { favorites } = useFavorites();
  const { startDownload } = useDownloads();
  const currentTrack = useCurrentTrack();
  const { isPlaying } = usePlayerState();
  const bottomSpacing = useBottomTabSpacing();

  const [playlistName, setPlaylistName] = useState<string>(typeof id === 'string' ? id : 'Playlist');
  const [playlistTracks, setPlaylistTracks] = useState<AppTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [artworkUrl, setArtworkUrl] = useState<string | null>(null);

  useEffect(() => {
    if (id === 'liked') {
      setPlaylistName('Liked Music');
      setPlaylistTracks(favorites);
      setArtworkUrl(favorites.length > 0 ? favorites[0].artwork : null);
      setLoading(false);
    } else if (id) {
      loadPlaylistDetails();
    }
  }, [id, favorites]);

  const loadPlaylistDetails = async () => {
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
  };

  const totalDuration = playlistTracks.reduce((acc, t) => acc + t.duration, 0);

  const renderTrackItem = ({ item, index }: { item: AppTrack; index: number }) => {
    const trackId = item.id;
    const isActive = !!(currentTrack?.id === trackId || (currentTrack?.id && currentTrack.id.includes(trackId)));
    return (
      <SongCard
        title={item.title}
        artist={item.artist}
        album={item.album}
        artwork={item.artwork}
        rightIcon="bullet"
        isActive={isActive}
        isPlaying={isPlaying}
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

  const handlePlayPress = () => {
    if (playlistTracks[0]) {
      PlayerActions.skipToTrackFromYt({
        id: playlistTracks[0].id,
        title: playlistTracks[0].title,
        artist: playlistTracks[0].artist,
        album: playlistTracks[0].album,
        thumbnail: playlistTracks[0].artwork,
        url: playlistTracks[0].url?.toString() || `https://music.youtube.com/watch?v=${playlistTracks[0].id}`,
        duration: playlistTracks[0].duration,
        type: 'song',
        artistId: playlistTracks[0].artistId,
        albumId: playlistTracks[0].albumId,
      });
    }
  };

  const handleShufflePress = () => {
    // Shuffle logic if needed
  };

  const handleDownloadPress = async () => {
    if (playlistTracks.length === 0) {
      toast.info('This playlist has no tracks.');
      return;
    }

    toast.info(`Downloading ${playlistTracks.length} tracks...`);

    let success = 0;
    for (const track of playlistTracks) {
      const ok = await startDownload(track);
      if (ok) success++;
    }

    toast.success(`Offline download complete! Saved ${success}/${playlistTracks.length} tracks.`);
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
        data={playlistTracks}
        keyExtractor={(item) => item.id}
        renderItem={renderTrackItem}
        ListHeaderComponent={
          <PlaylistHeader
            playlistName={playlistName}
            playlistTracks={playlistTracks}
            artworkUrl={artworkUrl}
            totalDuration={totalDuration}
            onPlayPress={handlePlayPress}
            onShufflePress={handleShufflePress}
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
    paddingTop: 90,
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
