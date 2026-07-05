import { CreatePlaylistBottomSheet } from '@/components/library/CreatePlaylistBottomSheet';
import { Alert } from '@/components/ui/alert';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';
import { SegmentedControl } from '@/components/ui/segmented-control';



import { QueueTrackRow } from '@/components/library/QueueTrackRow';
import { ThemedView } from '@/components/themed-view';
import { Muted, Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useTrackOptions } from '@/contexts/track-options-context';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';

import { PlaylistCard, PlaylistRowCard } from '@/components/cards';
import { type AppTrack } from '@/components/player/Tracks';
import { Button } from '@/components/ui/button';
import {
  PlayerActions,
  useActiveTrackIndex,
  useDownloads,
  useFavorites,
  usePlayerState,
  usePlaylists,
  useQueue,
} from '@/services';
import { Cog } from 'lucide-react-native';

type Tab = 'playlists' | 'downloads';

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const bottomSpacing = useBottomTabSpacing();
  const { openPlaylistOptions } = useTrackOptions();

  const [activeTab, setActiveTab] = useState<Tab>('playlists');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertDesc, setAlertDesc] = useState('');
  const [onConfirm, setOnConfirm] = useState<() => void>(() => { });

  // Favorites Hook
  const { favorites, toggleFavorite } = useFavorites();

  // Playlists Hook
  const { playlists, createPlaylist, deletePlaylist } = usePlaylists();

  // Downloads Hook
  const {
    downloadedTracks,
    removeDownload,
    downloadingIds,
    downloadingTracks,
    pausedDownloadingIds,
    pauseDownload,
    cancelDownload,
    startDownload
  } = useDownloads();

  // Playback Queue Hooks
  const queue = useQueue();
  const activeIndex = useActiveTrackIndex();
  const { isPlaying } = usePlayerState();

  const handleTrackPress = useCallback(async (index: number, track: AppTrack) => {
    try {
      const existingIdx = queue.findIndex((t) => String(t.id) === String(track.id));
      if (existingIdx >= 0) {
        await TrackPlayer.skip(existingIdx);
        await TrackPlayer.play();
      } else {
        await PlayerActions.addTrack(track, true);
      }
    } catch (e) {
      console.warn('ProfileScreen track press error', e);
    }
  }, [queue]);





  const handleDownloadTrackPress = useCallback(async (index: number, track: AppTrack) => {
    try {
      const tracksToPlay = downloadedTracks.map(d => d.track);
      await PlayerActions.playCollection(tracksToPlay);
      await PlayerActions.skipToTrack(String(track.id));
    } catch (e) {
      console.warn('Failed to play download track', e);
    }
  }, [downloadedTracks]);

  const currentTrack = queue[activeIndex];

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* Profile Title Header */}
        <View style={styles.header}>
          <View />
          <Button variant="secondary" size="icon" onPress={() => router.push('/settings')}>
            <Cog size={20} color={colors.primary} />
          </Button>
        </View>

        {/* Segmented Tabs: Playlists / Downloads */}
        <SegmentedControl
          options={[
            { value: 'playlists', label: 'Playlists', badge: playlists.length + 1 },
            { value: 'downloads', label: 'Downloads', badge: downloadedTracks.length },
          ]}
          selectedValue={activeTab}
          onChange={(val) => setActiveTab(val as Tab)}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSpacing + 20 }]}
        >
          {activeTab === 'playlists' ? (
            <View style={styles.listSection}>
              <View style={styles.playlistGrid}>
                {/* Create Playlist card button */}
                <TouchableOpacity
                  onPress={() => setShowCreateModal(true)}
                  style={[styles.createPlaylistCard, { backgroundColor: colors.card, borderColor: colors.border, width: '47%' }]}
                >
                  <Feather name="plus" size={32} color={colors.primary} />
                  <Typography style={[styles.createPlaylistCardText, { color: colors.primary }]}>
                    Create Playlist
                  </Typography>
                </TouchableOpacity>

                {/* Special Liked Music Auto Playlist Card */}
                <PlaylistCard
                  id="liked"
                  name="Liked Music"
                  songCount={favorites.length}
                  isLikedMusic={true}
                  onPress={() => router.push('/playlist/liked')}
                  style={{ width: '47%', marginRight: 0 }}
                  onLongPress={() => {
                    openPlaylistOptions({
                      id: 'liked',
                      name: 'Liked Music',
                      songCount: favorites.length,
                      artwork: 'liked',
                    });
                  }}
                />

                {/* User Custom Playlists */}
                {playlists.map((playlist) => (
                  <PlaylistCard
                    key={playlist.id}
                    id={playlist.id}
                    name={playlist.name}
                    songCount={playlist.tracks.length}
                    onPress={() => router.push(`/playlist/${playlist.id}`)}
                    style={{ width: '47%', marginRight: 0 }}
                    onLongPress={() => {
                      openPlaylistOptions({
                        id: playlist.id,
                        name: playlist.name,
                        songCount: playlist.tracks.length,
                        artwork: playlist.tracks[0]?.artwork,
                      });
                    }}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.listSection}>
              {/* Active Downloading Progress Rows */}
              {Object.keys(downloadingIds).map((trackId) => {
                const track = downloadingTracks[trackId];
                const progress = downloadingIds[trackId] || 0;
                const isPaused = pausedDownloadingIds[trackId];
                if (!track) return null;

                return (
                  <View key={`downloading-${trackId}`} style={styles.downloadingRow}>
                    <Image source={track.artwork && track.artwork.trim() !== '' ? { uri: track.artwork } : require('@/assets/images/icon.png')} style={styles.downloadingArtwork} />
                    <View style={styles.downloadingMeta}>
                      <Typography style={{ fontWeight: '600', fontSize: 15 }} numberOfLines={1}>
                        {track.title}
                      </Typography>
                      <Muted style={{ fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                        {isPaused ? 'Paused' : `Downloading... ${Math.round(progress * 100)}%`}
                      </Muted>
                      <View style={styles.progressBarContainer}>
                        <View style={[
                          styles.progressBar,
                          {
                            width: `${progress * 100}%`,
                            backgroundColor: isPaused ? colors.mutedForeground : colors.primary
                          }
                        ]} />
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 12 }}>
                      <TouchableOpacity onPress={() => isPaused ? startDownload(track) : pauseDownload(track.id)}>
                        <Feather name={isPaused ? "play" : "pause"} size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => cancelDownload(track.id)}>
                        <Feather name="x-circle" size={18} color="#FF3B30" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {downloadedTracks.length === 0 && Object.keys(downloadingIds).length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                  <Feather name="download" size={48} color={colors.mutedForeground} style={{ marginBottom: 15, opacity: 0.5 }} />
                  <Typography style={{ fontWeight: '600', fontSize: 16 }}>No offline downloads</Typography>
                  <Muted style={{ marginTop: 6, textAlign: 'center', paddingHorizontal: 40 }}>
                    Songs you download will appear here so you can listen offline.
                  </Muted>
                </View>
              ) : (
                downloadedTracks.map((download, i) => (
                  <QueueTrackRow
                    key={download.track.id + '-download-' + i}
                    track={download.track}
                    index={i}
                    isActive={currentTrack?.id === download.track.id}
                    isPlaying={isPlaying && currentTrack?.id === download.track.id}
                    onPress={() => handleDownloadTrackPress(i, download.track)}
                    onRemove={() => {
                      setAlertTitle('Remove Download');
                      setAlertDesc(`Remove "${download.track.title}" from device?`);
                      setOnConfirm(() => () => removeDownload(download.track.id));
                      setAlertVisible(true);
                    }}
                  />
                ))
              )}
            </View>
          )}
        </ScrollView>

      </SafeAreaView>

      {/* Create Playlist dialog BottomSheet */}
      <CreatePlaylistBottomSheet
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <Alert
        visible={alertVisible}
        onClose={() => setAlertVisible(false)}
        title={alertTitle}
        description={alertDesc}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={onConfirm}
        variant="destructive"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    padding: 36,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerSub: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileCard: {
    padding: 16,
    marginBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMetadata: {
    gap: 4,
  },
  username: {
    fontSize: 20,
    fontWeight: '700',
  },
  userSub: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 16,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  listSection: {
    paddingBottom: 20,
  },
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    rowGap: 16,
  },
  createPlaylistCard: {
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createPlaylistCardText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  createPlaylistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 20,
    gap: 12,
  },
  createPlaylistText: {
    fontSize: 15,
    fontWeight: '700',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playlistSub: {
    fontSize: 13,
    marginTop: 2,
  },
  deletePlaylistBtn: {
    padding: 8,
  },
  likedIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  downloadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  downloadingArtwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 12,
  },
  downloadingMeta: {
    flex: 1,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
