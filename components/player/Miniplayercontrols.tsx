import {
  View, Text, Image, ActivityIndicator, Pressable, StyleSheet,
} from 'react-native';
import { type AppTrack } from './Tracks';
import { useAppTheme } from '@/contexts/app-theme-context';
import { ThemedText } from '../themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MINI_PLAYER_HEIGHT } from '@/constants/layout';
import MarqueeText from './MarqueeText';

import { useRouter } from 'expo-router';

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
  const { colors } = useAppTheme();
  const router = useRouter();
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
            <MarqueeText style={[styles.artist, { color: '#999' }]}>
              {`${track.artist}${track.album ? ` • ${track.album}` : ''}`}
            </MarqueeText>
        </View>
      </Pressable>

      {/* Play / Pause */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); onPlayPause(); }}
        style={{ backgroundColor: isBuffering ? colors.accent : colors.background, borderColor: colors.accent, marginRight: 8 }}
        className='p-3 rounded-full border active:scale-95'
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {isBuffering
          ? <ActivityIndicator size="small" color={colors.accentForeground} />
          : <IconSymbol name={isPlaying ? 'pause.fill' : 'play.fill'} size={20} color={colors.accentForeground} active={isPlaying} />}
      </Pressable>

      {/* Next */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); onNext(); }}
        style={{ backgroundColor: colors.background, borderColor: colors.border, marginRight: 8 }}
        className='p-3 rounded-full border active:scale-95'
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <IconSymbol name="forward.fill" size={20} color={colors.accentForeground} />
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
  }
});