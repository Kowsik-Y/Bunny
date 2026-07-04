import {
  View, Text, Image, ActivityIndicator, Pressable, StyleSheet,
} from 'react-native';
import { type AppTrack } from './Tracks';
import { useAppTheme } from '@/contexts/app-theme-context';
import { ThemedText } from '../themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MINI_PLAYER_HEIGHT } from '@/constants/layout';
import MarqueeText from './MarqueeText';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pause, Play, SkipForward } from 'lucide-react-native';

const MINI_HEIGHT = MINI_PLAYER_HEIGHT;

type Props = {
  track: AppTrack;
  isPlaying: boolean;
  isBuffering: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onExpand: () => void;
};

export default function MiniPlayerControls({
  track, isPlaying, isBuffering, onPlayPause, onNext, onExpand,
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
          <MarqueeText style={[styles.title, { color: colors.text }]}>{track.title}</MarqueeText>
          <MarqueeText style={[styles.artist, { color: colors.mutedForeground }]}>
            {`${track.artist}${track.album ? ` • ${track.album}` : ''}`}
          </MarqueeText>
        </View>
      </Pressable>

      {/* Play / Pause */}
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
        onPress={(e) => { e.stopPropagation?.(); if (!isDummy) onNext(); }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  expandArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  progressBarBg: {
    position: 'absolute',
    top: 0,
    left: 25,
    right: 25,
    height: 2,
  },
  artwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
    marginLeft: 12,
    backgroundColor: '#f0f0f5',
  },
  info: {
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