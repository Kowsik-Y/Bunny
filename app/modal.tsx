import { StyleSheet, View, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer, {
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ModalScreen() {
  const { colors } = useAppTheme();
  const playback = usePlaybackState();
  const progress = useProgress(500);
  const activeTrack = useActiveTrack();
  const isPlaying = playback.state === State.Playing;

  const handlePlayPause = async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  };

  const handleNext = async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch {
      // Ignore if there is no next track.
    }
  };

  const handlePrevious = async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch {
      // Ignore if there is no previous track.
    }
  };

  const progressPercent = progress.duration
    ? Math.min(1, progress.position / progress.duration)
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.artworkWrap}>
          {activeTrack?.artwork && String(activeTrack.artwork).trim() !== '' ? (
            <Image source={{ uri: String(activeTrack.artwork) }} style={styles.artwork} />
          ) : (
            <Image source={require('@/assets/images/icon.png')} style={styles.artwork} />
          )}
        </View>

        <View style={styles.info}>
          <ThemedText type="title" numberOfLines={1}>
            {activeTrack?.title ?? 'Nothing Playing'}
          </ThemedText>
          <ThemedText style={{ color: colors.mutedForeground }} numberOfLines={1}>
            {activeTrack?.artist ?? 'Start a track'}
          </ThemedText>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: colors.primary, width: `${progressPercent * 100}%` },
            ]}
          />
        </View>

        <View style={styles.controlsRow}>
          <Pressable onPress={handlePrevious} style={styles.controlButton}>
            <IconSymbol
              name="chevron.right"
              color={colors.text}
              size={28}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>
          <Pressable
            onPress={handlePlayPause}
            style={[styles.playButton, { backgroundColor: colors.primary }]}>
            <ThemedText type="defaultSemiBold" style={{ color: colors.primaryForeground }}>
              {isPlaying ? 'Pause' : 'Play'}
            </ThemedText>
          </Pressable>
          <Pressable onPress={handleNext} style={styles.controlButton}>
            <IconSymbol name="chevron.right" color={colors.text} size={28} />
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  artworkWrap: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
  artwork: {
    width: 260,
    height: 260,
    borderRadius: 18,
  },
  info: {
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    width: '100%',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  controlButton: {
    padding: 12,
  },
  playButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
});
