import React, { useState, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Pressable,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { usePinnedTracks, useCurrentTrack, usePlayerState, PlayerActions } from '@/services';
import { type PinnedItem } from '@/services/pinned';
import { useTrackOptions } from '@/contexts/track-options-context';
import { Play, Pause } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const PAGE_WIDTH = width - 32; // Aligning with the screen padding
const ITEM_SIZE = (PAGE_WIDTH - 20) / 3; // 3 columns with a 10px gap

function SpeedDialImage({ artwork }: { artwork?: string | null }) {
  const [uri, setUri] = React.useState<string | null>(
    artwork && artwork.trim() !== '' ? artwork : null
  );

  React.useEffect(() => {
    setUri(artwork && artwork.trim() !== '' ? artwork : null);
  }, [artwork]);

  return (
    <Image
      source={uri ? { uri } : require('@/assets/images/icon.png')}
      style={styles.artwork}
      onError={() => {
        if (uri && uri.includes('/maxresdefault.jpg')) {
          setUri(uri.replace('/maxresdefault.jpg', '/hqdefault.jpg'));
        } else {
          setUri(null);
        }
      }}
    />
  );
}

export function SpeedDial() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { pinnedTracks } = usePinnedTracks();
  const { openTrackOptions, openAlbumOptions, openPlaylistOptions, openArtistOptions } = useTrackOptions();
  const currentTrack = useCurrentTrack();
  const { isPlaying } = usePlayerState();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Group pinned items into pages of 6 items (for 2x3 grid)
  const chunkedPages = useMemo(() => {
    if (!pinnedTracks) return [];
    const pages: PinnedItem[][] = [];
    for (let i = 0; i < pinnedTracks.length; i += 6) {
      pages.push(pinnedTracks.slice(i, i + 6));
    }
    return pages;
  }, [pinnedTracks]);

  const pageHeight = useMemo(() => {
    if (!pinnedTracks || pinnedTracks.length === 0) return 0;
    if (pinnedTracks.length <= 3) {
      return ITEM_SIZE;
    }
    return ITEM_SIZE * 2 + 10;
  }, [pinnedTracks]);

  if (!pinnedTracks || pinnedTracks.length === 0) {
    return null;
  }

  const handleItemPress = async (item: PinnedItem) => {
    if (item.type === 'track') {
      try {
        await PlayerActions.addTrack({
          id: item.id,
          title: item.title,
          artist: item.artist || '',
          album: 'Single',
          artwork: item.artwork || '',
          url: 'https://dummy.com/track-' + item.id + '.mp3',
          duration: item.duration || 0,
          artistId: item.artistId,
          albumId: item.albumId,
        }, true);
      } catch (e) {
        console.warn('[SpeedDial] Failed to play track', e);
      }
    } else if (item.type === 'album') {
      router.push(`/album/${item.id}` as any);
    } else if (item.type === 'artist') {
      router.push(`/artist/${item.id}` as any);
    } else if (item.type === 'playlist') {
      router.push(`/playlist/${item.id}` as any);
    }
  };

  const handleItemLongPress = (item: PinnedItem) => {
    if (item.type === 'album') {
      openAlbumOptions({
        id: item.id,
        title: item.title,
        artist: item.artist || '',
        artwork: item.artwork || '',
        artistId: item.artistId,
      });
    } else if (item.type === 'playlist') {
      openPlaylistOptions({
        id: item.id,
        name: item.title,
        artwork: item.artwork || '',
      });
    } else if (item.type === 'artist') {
      openArtistOptions({
        id: item.id,
        name: item.title,
        artwork: item.artwork || '',
      });
    } else {
      // track
      openTrackOptions({
        id: item.id,
        title: item.title,
        artist: item.artist || '',
        album: 'Single',
        artwork: item.artwork || '',
        url: 'https://dummy.com/track-' + item.id + '.mp3',
        duration: item.duration || 0,
        artistId: item.artistId,
        albumId: item.albumId,
      });
    }
  };

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (PAGE_WIDTH + 12));
    if (idx !== currentPage) {
      setCurrentPage(idx);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Typography style={[styles.sectionTitle, { color: colors.text }]}>
          Speed Dial
        </Typography>
        {chunkedPages.length > 1 && (
          <Typography style={[styles.pageIndicator, { color: colors.mutedForeground }]}>
            {currentPage + 1} / {chunkedPages.length}
          </Typography>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={PAGE_WIDTH + 12}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        style={{ height: pageHeight }}
      >
        {chunkedPages.map((pageTracks, pageIdx) => (
          <View key={pageIdx} style={[styles.page, { height: pageHeight }]}>
            <View style={styles.grid2x2}>
              {pageTracks.map((item, idx) => {
                const isActive = item.type === 'track' && currentTrack && String(currentTrack.id) === String(item.id);
                const isThisPlaying = isActive && isPlaying;

                return (
                  <Animated.View
                    key={item.id + idx}
                    entering={FadeIn.delay(idx * 40).duration(250)}
                    style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
                  >
                    <Pressable
                      onPress={() => handleItemPress(item)}
                      onLongPress={() => handleItemLongPress(item)}
                      android_ripple={{ color: colors.border }}
                      style={({ pressed }) => [
                        styles.gridItem,
                        {
                          borderColor: isActive ? colors.primary : colors.border,
                          borderWidth: isActive ? 2 : 1,
                          opacity: pressed ? 0.85 : 1,
                          backgroundColor: colors.card,
                        },
                      ]}
                    >
                      <SpeedDialImage artwork={item.artwork} />
                      {isActive && (
                        <View style={[styles.playOverlay, { backgroundColor: 'rgba(0,0,0,0.45)' }]}>
                          {isThisPlaying ? (
                            <Pause size={24} fill="#FFF" color="#FFF" />
                          ) : (
                            <Play size={24} fill="#FFF" color="#FFF" />
                          )}
                        </View>
                      )}
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageIndicator: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  page: {
    width: PAGE_WIDTH,
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  gridItem: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius:8
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
