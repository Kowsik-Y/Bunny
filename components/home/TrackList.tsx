import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Typography, Muted } from '@/components/ui/typography';
import { Pause, Play } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Skeleton } from '@/components/ui/skeleton';
import { type QuickTrack } from './TrendingCarousel';
import { useCurrentTrack, usePlayerState, PlayerActions } from '@/services';
import { addAlpha } from '@/constants/theme';

interface TrackListProps {
  title: string;
  tracks: QuickTrack[];
  loading: boolean;
  onPlayTracks: (tracks: QuickTrack[], index: number) => void;
  onLongPressTrack?: (track: QuickTrack) => void;
  /** Number of tracks to show before 'see more'. Default = 5 */
  limit?: number;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function TrackListImage({ artwork, style }: { artwork?: string | null; style: any }) {
  const [uri, setUri] = React.useState<string | null>(
    artwork && artwork.trim() !== '' ? artwork : null
  );

  React.useEffect(() => {
    setUri(artwork && artwork.trim() !== '' ? artwork : null);
  }, [artwork]);

  return (
    <Image
      source={uri ? { uri } : require('@/assets/images/icon.png')}
      style={style}
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

export function TrackList({ title, tracks, loading, onPlayTracks, onLongPressTrack, limit = 5 }: TrackListProps) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? tracks : tracks.slice(0, limit);
  const currentTrack = useCurrentTrack();
  const { isPlaying } = usePlayerState();

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <Typography style={[styles.title, { color: colors.text }]}>{title}</Typography>
        {tracks.length > limit && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
            <Typography style={[styles.toggle, { color: colors.primary }]}>
              {expanded ? 'Show less' : 'See all'}
            </Typography>
          </TouchableOpacity>
        )}
      </View>

      {/* Track rows */}
      <View style={styles.list}>
        {loading
          ? [1, 2, 3, 4].map((k) => (
            <View key={k} style={styles.row}>
              <Skeleton style={styles.thumbSkeleton} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton style={{ height: 13, width: '70%', borderRadius: 4 }} />
                <Skeleton style={{ height: 11, width: '45%', borderRadius: 4 }} />
              </View>
            </View>
          ))
          : shown.map((track, i) => {
            const isActive = !!(currentTrack && (
              currentTrack.id === track.id ||
              currentTrack.id === `yt-${track.id}` ||
              track.id === `yt-${currentTrack.id}`
            ));
            const isThisPlaying = isActive && isPlaying;

            return (
              <Animated.View key={track.id + i} entering={FadeInUp.delay(i * 45).duration(280)}>
                <Pressable
                  onPress={() => {
                    if (isActive) {
                      PlayerActions.playPause(isPlaying);
                    } else {
                      onPlayTracks(tracks, i);
                    }
                  }}
                  onLongPress={() => onLongPressTrack?.(track)}
                  android_ripple={{
                    color: colors.border
                  }}
                  delayLongPress={250}
                  style={[
                    styles.row,
                    { borderRadius: 10 },
                    isActive && {
                      backgroundColor: addAlpha(colors.border, 0.6),
                      paddingHorizontal: 8,
                    }
                  ]}
                >
                  {/* Track number */}
                  <Typography style={[styles.num, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                    {String(i + 1).padStart(2, '0')}
                  </Typography>

                  {/* Artwork */}
                  <View style={{ position: 'relative' }}>
                    <TrackListImage artwork={track.artwork} style={styles.thumb} />
                    {isActive && (
                      <View style={[
                        StyleSheet.absoluteFill,
                        {
                          backgroundColor: 'rgba(0,0,0,0.45)',
                          justifyContent: 'center',
                          alignItems: 'center',
                          borderRadius: 10,
                        }
                      ]}>
                        {isThisPlaying ? (
                          <Pause size={16} color="#fff" fill="#fff" />
                        ) : (
                          <Play size={16} color="#fff" fill="#fff" />
                        )}
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.info}>
                    <Typography numberOfLines={1} style={[styles.trackName, { color: isActive ? colors.primary : colors.text}]}>
                      {track.title}
                    </Typography>
                    <Muted numberOfLines={1} style={styles.artist}>
                      {track.artist}
                    </Muted>
                  </View>

                  {/* Duration */}
                  <View style={styles.right}>
                    {track.duration > 0 && (
                      <Muted style={[styles.duration,{fontWeight:isActive ? "700" : "500"}]}>{formatDuration(track.duration)}</Muted>
                    )}
                  </View>
                </Pressable>

                {/* Divider */}
                {i < shown.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </Animated.View>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  toggle: {
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  num: {
    fontSize: 12,
    fontWeight: '700',
    width: 22,
    textAlign: 'right',
  },
  thumbSkeleton: {
    width: 46,
    height: 46,
    borderRadius: 10,
  },
  thumb: {
    width: 46,
    height: 46,
    borderRadius: 10,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    fontSize: 12,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
  },
  duration: {
    fontSize: 11,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 80,
  },
});
