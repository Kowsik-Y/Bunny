import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import TrackPlayer from 'react-native-track-player';
import { Feather } from '@expo/vector-icons';

import { LinearGradient } from 'expo-linear-gradient';

import { H1, Muted, Typography, Typography as Text } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { QueueTrackRow } from '@/components/library/QueueTrackRow';
import { EmptyState } from '@/components/library/EmptyState';
import { 
  PlayerActions, 
  useActiveTrackIndex, 
  usePlayerState, 
  useQueue, 
  useFavorites,
  usePlaylists,
  useDownloads,
} from '@/services';
import { type AppTrack } from '@/components/player/Tracks';
import { SwipeBottomSheet } from '@/components/player/SwipeBottomSheet';

type Tab = 'playlists' | 'downloads';

export default function ProfileScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const bottomSpacing = useBottomTabSpacing();

  const [activeTab, setActiveTab] = useState<Tab>('playlists');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

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


  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowCreateModal(false);
  };

  const currentTrack = queue[activeIndex];

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* Profile Title Header */}
        <View style={styles.header}>
          <View/>
          <TouchableOpacity 
            onPress={() => router.push('/settings')} 
            style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <IconSymbol name="gearshape.fill" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Segmented Tabs: Playlists / Downloads */}
        <View style={[styles.tabRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity 
            onPress={() => setActiveTab('playlists')} 
            style={[styles.tabBtn, activeTab === 'playlists' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Typography style={[styles.tabText, { 
              fontWeight: activeTab === 'playlists' ? '700' : '400',
              color: activeTab === 'playlists' ? colors.primary : colors.mutedForeground
            }]}>
              Playlists ({playlists.length + 1})
            </Typography>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setActiveTab('downloads')} 
            style={[styles.tabBtn, activeTab === 'downloads' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Typography style={[styles.tabText, { 
              fontWeight: activeTab === 'downloads' ? '700' : '400',
              color: activeTab === 'downloads' ? colors.primary : colors.mutedForeground
            }]}>
              Downloads ({downloadedTracks.length})
            </Typography>
          </TouchableOpacity>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSpacing + 20 }]}
        >
          {activeTab === 'playlists' ? (
            <View style={styles.listSection}>
              {/* Create Playlist row button */}
              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={[styles.createPlaylistRow, { borderColor: colors.border }]}
              >
                <Feather name="plus-circle" size={20} color={colors.primary} />
                <Typography style={[styles.createPlaylistText, { color: colors.primary }]}>
                  Create New Playlist
                </Typography>
              </TouchableOpacity>

              {/* Special Liked Music Auto Playlist Row */}
              <TouchableOpacity
                onPress={() => router.push('/playlist/liked')}
                style={styles.playlistRow}
              >
                <LinearGradient
                  colors={['#8E2DE2', '#4A00E0']}
                  style={styles.likedIconContainer}
                >
                  <Feather name="thumbs-up" size={18} color="#ffffff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Typography style={styles.playlistName}>Liked Music</Typography>
                  <Muted style={styles.playlistSub}>Auto playlist · {favorites.length} songs</Muted>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              </TouchableOpacity>

              {/* User Custom Playlists */}
              {playlists.map((playlist) => (
                <TouchableOpacity
                  key={playlist.id}
                  onPress={() => router.push(`/playlist/${playlist.id}`)}
                  style={styles.playlistRow}
                >
                  <Feather name="folder" size={28} color={colors.primary} style={{ marginRight: 15 }} />
                  <View style={{ flex: 1 }}>
                    <Typography style={styles.playlistName}>{playlist.name}</Typography>
                    <Muted style={styles.playlistSub}>{playlist.tracks.length} songs</Muted>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert('Delete Playlist', `Delete "${playlist.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deletePlaylist(playlist.id) }
                      ]);
                    }}
                    style={styles.deletePlaylistBtn}
                  >
                    <Feather name="trash-2" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
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
                      Alert.alert('Remove Download', `Remove "${download.track.title}" from device?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Remove', style: 'destructive', onPress: () => removeDownload(download.track.id) }
                      ]);
                    }}
                  />
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Create Playlist dialog BottomSheet */}
      <SwipeBottomSheet
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        backgroundColor={colors.card}
      >
        <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Playlist</Text>
        <View style={styles.inputContainer}>
          <TextInput
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            placeholder="Playlist name"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
            autoFocus
          />
        </View>
        <TouchableOpacity onPress={handleCreatePlaylist} style={[styles.createBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </SwipeBottomSheet>
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
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 24,
  },
  tabText: {
    fontSize: 14,
  },
  listSection: {
    paddingBottom: 20,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  textInput: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  createBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
