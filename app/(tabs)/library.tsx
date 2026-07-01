import { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';

import { type AppTrack } from '@/components/player/Tracks';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { H1, Muted, Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import {
  PlayerActions,
  useActiveTrackIndex,
  usePlayerState,
  useQueue,
} from '@/services/SetupService';
import { useFavorites } from '@/services/favorites';

import { QueueTrackRow } from '@/components/library/QueueTrackRow';
import { EmptyState } from '@/components/library/EmptyState';
import { NowPlayingSection } from '@/components/library/NowPlayingSection';

type Tab = 'queue' | 'saved';

export default function LibraryScreen() {
  const { colors } = useAppTheme();
  const queue = useQueue();
  const activeIndex = useActiveTrackIndex();
  const { isPlaying } = usePlayerState();
  const bottomSpacing = useBottomTabSpacing();
  const [tab, setTab] = useState<Tab>('queue');
  const { favorites, toggleFavorite } = useFavorites();

  const handleTrackPress = useCallback(async (index: number) => {
    try {
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
    } catch (e) {
      console.warn('LibraryScreen skip error', e);
    }
  }, []);

  const handlePlaySavedTrack = useCallback(async (track: AppTrack, index: number) => {
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add(favorites);
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
    } catch (e) {
      console.warn('LibraryScreen play saved track error', e);
    }
  }, [favorites]);

  const handleRemove = useCallback((index: number, track: AppTrack) => {
    Alert.alert('Remove from queue', 'Remove  + track.title +  from the queue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try { await TrackPlayer.remove(index); } catch (e) { console.warn(e); }
        },
      },
    ]);
  }, []);

  const handleClearQueue = () => {
    const removable = queue.filter((_, i) => i !== activeIndex);
    if (removable.length === 0) return;
    Alert.alert('Clear queue', 'Remove all ' + removable.length + ' other tracks from the queue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          const toRemove: number[] = [];
          for (let i = 0; i < queue.length; i++) {
            if (i !== activeIndex) toRemove.push(i);
          }
          for (const idx of toRemove.reverse()) {
            try { await TrackPlayer.remove(idx); } catch { }
          }
        },
      },
    ]);
  };

  const upNext = queue.slice(activeIndex + 1);
  const played = queue.slice(0, activeIndex);
  const currentTrack = queue[activeIndex];

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <View>
            <Muted style={[styles.headerSub, { color: colors.primary }]}>YOUR MUSIC</Muted>
            <H1>Library</H1>
          </View>
          <View style={styles.headerActions}>
            {tab === 'queue' && queue.length > 1 && (
              <TouchableOpacity onPress={handleClearQueue} style={[styles.clearBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <IconSymbol name='xmark' size={16} color='#FF3B30' />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          {(['queue', 'saved'] as Tab[]).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tabBtn, t === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
              <Typography style={{ fontSize: 14, fontWeight: t === tab ? '700' : '400', color: t === tab ? colors.primary : colors.mutedForeground, textTransform: 'capitalize' }}>
                {t === 'queue' ? ('Queue' + (queue.length > 0 ? ' (' + queue.length + ')' : '')) : 'Saved'}
              </Typography>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: bottomSpacing + 20 }]}>
          {tab === 'queue' ? (
            queue.length === 0 ? (
              <EmptyState tab='queue' />
            ) : (
              <>
                {currentTrack && (
                  <NowPlayingSection
                    currentTrack={currentTrack}
                    isPlaying={isPlaying}
                    onPlayPausePress={() => PlayerActions.playPause(isPlaying)}
                  />
                )}
                {upNext.length > 0 && (
                  <View style={styles.section}>
                    <Typography style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                      {'UP NEXT · ' + upNext.length + ' track' + (upNext.length !== 1 ? 's' : '')}
                    </Typography>
                    {upNext.map((track, i) => {
                      const realIdx = activeIndex + 1 + i;
                      return (
                        <QueueTrackRow
                          key={track.id + '-' + realIdx}
                          track={track}
                          index={realIdx}
                          isActive={false}
                          isPlaying={false}
                          onPress={() => handleTrackPress(realIdx)}
                          onRemove={() => handleRemove(realIdx, track)}
                        />
                      );
                    })}
                  </View>
                )}
                {played.length > 0 && (
                  <View style={styles.section}>
                    <Typography style={[styles.sectionLabel, { color: colors.mutedForeground }]}>PREVIOUSLY PLAYED</Typography>
                    {[...played].reverse().map((track, i) => {
                      const realIdx = activeIndex - 1 - i;
                      return (
                        <QueueTrackRow
                          key={track.id + '-' + realIdx}
                          track={track}
                          index={realIdx}
                          isActive={false}
                          isPlaying={false}
                          onPress={() => handleTrackPress(realIdx)}
                          onRemove={() => handleRemove(realIdx, track)}
                        />
                      );
                    })}
                  </View>
                )}
              </>
            )
          ) : (
            favorites.length === 0 ? (
              <EmptyState tab='saved' />
            ) : (
              <View style={styles.section}>
                <Typography style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                  {'SAVED TRACKS · ' + favorites.length + ' track' + (favorites.length !== 1 ? 's' : '')}
                </Typography>
                {favorites.map((track, i) => (
                  <QueueTrackRow
                    key={track.id + '-' + i}
                    track={track}
                    index={i}
                    isActive={false}
                    isPlaying={false}
                    onPress={() => handlePlaySavedTrack(track, i)}
                    onRemove={() => toggleFavorite(track)}
                  />
                ))}
              </View>
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerSub: { fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  headerActions: { flexDirection: 'row', gap: 8 },
  clearBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, borderBottomWidth: 1, marginBottom: 12 },
  tabBtn: { paddingVertical: 10, paddingHorizontal: 4, marginRight: 24 },
  content: { paddingHorizontal: 16, paddingTop: 4 },
  section: { marginBottom: 24 },
  sectionLabel: { fontSize: 10, letterSpacing: 1.5, fontWeight: '700', marginBottom: 12, marginLeft: 4 },
});
