import { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Typography, Muted } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentTrack, usePlayerState, PlayerActions } from '@/services';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause } from 'lucide-react-native';


const { width } = Dimensions.get('window');
const CARD_W = width - 56; // one card + small peek of next
const CARD_H = 220;
const SNAP_OFFSET = 20;

/** Falls back from maxresdefault → hqdefault when the hi-res image 404s */
function hqFallback(url: string): string {
  return url.replace('/maxresdefault.jpg', '/hqdefault.jpg');
}

/** Renders a card artwork image with automatic hi-res → hq fallback */
function ArtworkImage({ artwork }: { artwork: string }) {
  const [uri, setUri] = useState(
    artwork && artwork.trim() !== '' ? artwork : null
  );
  return (
    <Image
      source={uri ? { uri } : require('@/assets/images/icon.png')}
      style={styles.art}
      resizeMode="cover"
      onError={() => {
        if (uri && uri.includes('/maxresdefault.jpg')) {
          setUri(hqFallback(uri));
        } else {
          setUri(null); // show local fallback icon
        }
      }}
    />
  );
}


export interface QuickTrack {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  duration: number;
  artistId?: string;
  albumId?: string;
  artists?: { name: string; id: string }[];
  explicit?: boolean;
}

interface TrendingCarouselProps {
  title?: string;
  trending: QuickTrack[];
  loading: boolean;
  onPlayTracks: (tracks: QuickTrack[], index: number) => void;
  onLongPressTrack?: (track: QuickTrack) => void;
}

export function TrendingCarousel({ title, trending, loading, onPlayTracks, onLongPressTrack }: TrendingCarouselProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const currentTrack = useCurrentTrack();
  const { isPlaying, isBuffering } = usePlayerState();

  const outerGradient: [string, string] = isDark 
    ? [colors.border, colors.background] 
    : ['#FFFFFF', colors.border];
  const innerGradient: [string, string] = isDark 
    ? [colors.card, colors.card] 
    : [colors.secondary, '#FFFFFF'];
  const iconColor = colors.primary;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / (CARD_W + 12));
    setActiveIndex(idx);
  };
  return (
    <View style={styles.section}>
      {/* Header row */}
      <View style={styles.header}>
        <Typography style={[styles.sectionTitle, { color: colors.text }]}>
          {title || 'Trending'}
        </Typography>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {!loading && trending.slice(0, 8).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === activeIndex ? colors.primary : colors.border,
                  width: i === activeIndex ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {loading
          ? [1, 2, 3].map((k) => (
            <Skeleton key={k} style={[styles.card, { width: CARD_W }]} />
          ))
          : trending.map((track, i) => {
            const isActive = !!(currentTrack && (
              currentTrack.id === track.id ||
              currentTrack.id === `yt-${track.id}` ||
              track.id === `yt-${currentTrack.id}`
            ));
            const isThisPlaying = isActive && isPlaying;
            const isThisBuffering = isActive && isBuffering;
            const isDummy = track.id === 'no-track';
            const onPlayPause = () => {
              if (isActive) {
                PlayerActions.playPause(isPlaying);
              } else {
                onPlayTracks(trending, i);
              }
            };

            return (
              <Animated.View
                key={track.id + i}
                entering={FadeIn.delay(i * 60).duration(300)}
              >
                <Pressable
                  onPress={() => {
                    if (isActive) {
                      PlayerActions.playPause(isPlaying);
                    } else {
                      onPlayTracks(trending, i);
                    }
                  }}
                  delayLongPress={250}
                  onLongPress={() => onLongPressTrack?.(track)}
                  android_ripple={{
                    color: "#fff00",
                    foreground: true,
                  }}
                  style={[styles.card, { width: CARD_W }]}
                >
                  {/* Background artwork */}
                  <ArtworkImage artwork={track.artwork} />

                  {/* Gradient scrim */}
                  <View style={styles.scrim} />

                  {/* Giant rank number */}
                  <Typography style={styles.rankNum}>
                    {String(i + 1).padStart(2, '0')}
                  </Typography>

                  {/* Bottom info */}
                  <View style={styles.infoRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Typography numberOfLines={1} style={[styles.trackTitle, { flexShrink: 1 }]}>
                          {track.title}
                        </Typography>
                        {track.explicit && (
                          <View style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.35)',
                            paddingHorizontal: 4,
                            paddingVertical: 1,
                            borderRadius: 3,
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}>
                            <Typography style={{ fontSize: 9, fontWeight: '800', color: '#fff', lineHeight: 11 }}>
                              E
                            </Typography>
                          </View>
                        )}
                      </View>
                      <Muted numberOfLines={1} style={styles.trackArtist}>
                        {track.artist}
                      </Muted>
                    </View>
                    {/* Play / Pause button from MiniPlayerControls */}
                    <Pressable
                      onPress={(e) => { e.stopPropagation?.(); if (!isDummy) onPlayPause(); }}
                      disabled={isDummy}
                      style={({ pressed }) => [
                        styles.playPauseBtnShadow,
                        {
                          opacity: isDummy ? 0.3 : 1,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                        }
                      ]}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <LinearGradient
                        colors={outerGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.playPauseBtnOuter}
                      >
                        <LinearGradient
                          colors={innerGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.playPauseBtnInner}
                        >
                          {isThisBuffering ? (
                            <ActivityIndicator size="small" color={iconColor} />
                          ) : isThisPlaying ? (
                            <Pause size={16} strokeWidth={0} fill={iconColor} />
                          ) : (
                            <View style={{ marginLeft: 2 }}>
                              <Play size={16} strokeWidth={0} fill={iconColor} />
                            </View>
                          )}
                        </LinearGradient>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  scrollContent: {
    paddingLeft: SNAP_OFFSET,
    paddingRight: SNAP_OFFSET,
    gap: 12,
  },
  card: {
    height: CARD_H,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  art: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  scrim: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  rankNum: {
    position: 'absolute',
    top: 12,
    left: 16,
    fontSize: 64,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: -4,
    lineHeight: 68,
  },
  infoRow: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  playPauseBtnShadow: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  playPauseBtnOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseBtnInner: {
    width: 41.6,
    height: 41.6,
    borderRadius: 20.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
