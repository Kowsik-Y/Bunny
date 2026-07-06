import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { type AppTrack } from '@/components/player/Tracks';
import { Typography, Muted } from '@/components/ui/typography';
import { Play, Pause, X } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';

interface QueueTrackRowProps {
  track: AppTrack;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onPress: () => void;
  onRemove: () => void;
  fileSize?: string;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m) + ':' + s.toString().padStart(2, '0');
}

export function QueueTrackRow({
  track,
  index,
  isActive,
  isPlaying,
  onPress,
  onRemove,
  fileSize,
}: QueueTrackRowProps) {
  const { colors } = useAppTheme();
  const isDummy = track.url?.toString().includes('dummy.com');

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 30).duration(250)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.trackRow,
        isActive && { backgroundColor: addAlpha(colors.primary, 0.08), borderRadius: 14 },
      ]}
    >
      <TouchableOpacity style={styles.trackMain} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.artworkContainer}>
          {track.artwork && typeof track.artwork === 'string' && track.artwork.trim() !== '' ? (
            <Image
              source={{ uri: track.artwork }}
              style={styles.artwork}
            />
          ) : (
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.artwork}
            />
          )}
          {isActive && (
            <View style={[styles.nowPlayingOverlay, { backgroundColor: addAlpha(colors.primary, 0.8) }]}>
              {isPlaying
                ? <Pause size={14} color='#fff' fill='#fff' />
                : <Play size={14} color='#fff' fill='#fff' />}
            </View>
          )}
          {isDummy && !isActive && (
            <View style={[styles.nowPlayingOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <Pause size={12} color='#fff' fill='#fff' />
            </View>
          )}
        </View>
        <View style={styles.trackInfo}>
          <Typography
            variant='large'
            numberOfLines={1}
            style={isActive ? { color: colors.primary, fontWeight: '700' } : undefined}
          >
            {track.title}
          </Typography>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Muted numberOfLines={1} style={[styles.trackArtist, { flex: 1 }]}>
              {track.artist}
            </Muted>
            {fileSize && (
              <Muted style={{ fontSize: 11, fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                {fileSize}
              </Muted>
            )}
          </View>
        </View>
        <Muted style={styles.duration}>{formatDuration(track.duration)}</Muted>
      </TouchableOpacity>
      {!isActive && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.removeBtn}
        >
          <X size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 2,
  },
  trackMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  artworkContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  nowPlayingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    gap: 2,
  },
  trackArtist: {
    fontSize: 12,
  },
  duration: {
    fontSize: 12,
    marginLeft: 8,
  },
  removeBtn: {
    padding: 6,
    marginLeft: 6,
  },
});
