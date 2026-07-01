import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { type AppTrack } from '@/components/player/Tracks';
import { Typography, Muted } from '@/components/ui/typography';
import { BunnyCard } from '@/components/ui/bunny-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';

interface NowPlayingSectionProps {
  currentTrack: AppTrack;
  isPlaying: boolean;
  onPlayPausePress: () => void;
}

export function NowPlayingSection({
  currentTrack,
  isPlaying,
  onPlayPausePress,
}: NowPlayingSectionProps) {
  const { colors } = useAppTheme();

  return (
    <Animated.View entering={FadeInRight.duration(300)} style={styles.section}>
      <Typography style={[styles.sectionLabel, { color: colors.primary }]}>NOW PLAYING</Typography>
      <BunnyCard style={[styles.nowPlayingCard, { borderColor: addAlpha(colors.primary, 0.26), borderWidth: 1.5 }]}>
        <View style={styles.nowPlayingInner}>
          <Image
            source={{
              uri: typeof currentTrack.artwork === 'string'
                ? currentTrack.artwork
                : 'https://picsum.photos/400/400'
            }}
            style={styles.nowPlayingArt}
          />
          <View style={styles.nowPlayingInfo}>
            <Typography variant='large' numberOfLines={1} style={{ fontWeight: '700' }}>
              {currentTrack.title}
            </Typography>
            <Muted numberOfLines={1}>{currentTrack.artist}</Muted>
            <View style={styles.nowPlayingBadge}>
              <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
              <Typography variant='small' style={{ color: colors.primary, fontWeight: '700', fontSize: 10 }}>
                {isPlaying ? 'PLAYING' : 'PAUSED'}
              </Typography>
            </View>
          </View>
          <TouchableOpacity
            onPress={onPlayPausePress}
            style={[styles.miniPlayBtn, { backgroundColor: colors.primary }]}
          >
            <IconSymbol
              name={isPlaying ? 'pause.fill' : 'play.fill'}
              size={18}
              color={colors.primaryForeground}
            />
          </TouchableOpacity>
        </View>
      </BunnyCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 4,
  },
  nowPlayingCard: {
    padding: 12,
  },
  nowPlayingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nowPlayingArt: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  nowPlayingInfo: {
    flex: 1,
    gap: 2,
  },
  nowPlayingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
