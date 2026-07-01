import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { H1, Muted, Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { PlayerActions } from '@/services/SetupService';
import { useCurrentTrack, usePlayerState, useDownloads, toast } from '@/services';
import { getAlbumDetails } from '@/services/ytMusic';
import { Button } from '@/components/ui/button';
import { ThemedView } from '@/components/themed-view';
import { SongCard } from '@/components/cards';
import { AlbumHeader } from '@/components/album/AlbumHeader';
import { type AppTrack } from '@/components/player/Tracks';



export default function AlbumScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useAppTheme();
  const { startDownload } = useDownloads();
  const currentTrack = useCurrentTrack();
  const { isPlaying } = usePlayerState();
  const [albumData, setAlbumData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const handlePlayPress = () => {
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
      <FlatList
        data={albumData.tracks || []}
        keyExtractor={(item, index) => item.videoId || String(index)}
        renderItem={renderTrackItem}
        ListHeaderComponent={
          <AlbumHeader
            albumData={albumData}
            onPlayPress={handlePlayPress}
            onShufflePress={handleShufflePress}
            onHeartPress={handleHeartPress}
            onArtistPress={() => {
              if (albumData.artistId) {
                router.push(`/artist/${albumData.artistId}`);
              } else {
                router.push({ pathname: '/(tabs)/explore', params: { query: typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name } } as any);
              }
            }}
            onBackPress={() => router.back()}
            onDownloadPress={handleDownloadPress}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
    paddingBottom: 100,
  },
});
