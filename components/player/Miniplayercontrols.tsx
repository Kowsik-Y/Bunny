import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pause, Play, SkipForward } from 'lucide-react-native';
import {
  ActivityIndicator,
  Image,
  Pressable, StyleSheet, Text,
  View,
} from 'react-native';
import MarqueeText from './MarqueeText';
import { type AppTrack } from './Tracks';


type Props = {
  track: AppTrack;
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onNext: () => void;
  onExpand: () => void;
};

export default function MiniPlayerControls({
  track, isPlaying, isBuffering, position, duration, onPlayPause, onNext, onExpand,
}: Props) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const isDummy = track.id === 'no-track';

  const outerGradient: [string, string] = isDark
    ? [colors.border, colors.background]
    : ['#FFFFFF', colors.border];
  const innerGradient: [string, string] = isDark
    ? [colors.card, colors.card]
    : [colors.secondary, '#FFFFFF'];
  const iconColor = colors.primary;

  const progress = duration > 0 ? (position / duration) : 0;

  return (
    <View style={styles.container}>

      {/* Artwork + track info → tap to expand */}
      <Pressable
        onPress={onExpand}
        style={styles.expandArea}
        android_ripple={{ color: 'transparent' }}
      >
        <Image source={track.artwork && (track.artwork as string).trim() !== '' ? { uri: track.artwork as string } : require('@/assets/images/icon.png')} style={styles.artwork} />
        <View style={styles.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' }}>
            <MarqueeText
              speed={15}
              isExplicit={track.explicit}
              style={[styles.title, { color: colors.text}]}
            >
              {track.title}
            </MarqueeText>

          </View>
          <MarqueeText speed={15} style={[styles.artist, { color: colors.mutedForeground }]}>
            {`${track.artist}${track.album ? ` • ${track.album}` : ''}`}
          </MarqueeText>
        </View>
      </Pressable>

      {/* Play / Pause */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          if (!isDummy) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
            onPlayPause();
          }
        }}
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
            {isBuffering ? (
              <ActivityIndicator size="small" color={iconColor} />
            ) : isPlaying ? (
              <Pause size={16} strokeWidth={0} fill={iconColor} />
            ) : (
              <View style={{ marginLeft: 2 }}>
                <Play size={16} strokeWidth={0} fill={iconColor} />
              </View>
            )}
          </LinearGradient>
        </LinearGradient>
      </Pressable>

      {/* Next */}
      <Pressable
        onPress={(e) => {
          e.stopPropagation?.();
          if (!isDummy) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
            onNext();
          }
        }}
        disabled={isDummy}
        style={({ pressed }) => [
          styles.nextBtnShadow,
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
          style={styles.nextBtnOuter}
        >
          <LinearGradient
            colors={innerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.nextBtnInner}
          >
            <SkipForward size={14} color={iconColor} strokeWidth={3} fill={iconColor} />
          </LinearGradient>
        </LinearGradient>
      </Pressable>

      {/* Bottom progress border */}
      <View style={[styles.progressBarContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(100, progress * 100)}%`,
              backgroundColor: addAlpha(colors.primary, 0.7),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingBottom: 10,
  },
  expandArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  progressBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
  },
  progressBarFill: {
    height: '100%',
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    marginLeft: 12,
    backgroundColor: 'transparent',
  },
  info: {
    flex: 1,
    marginRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    fontSize: 12,
    color: '#999',
  },
  playPauseBtnShadow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 8,
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
  nextBtnShadow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  nextBtnOuter: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 1.0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
});