import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { VideoView } from 'expo-video';
import {
  Cast,
  Ellipsis,
  Film,
  ListMusic,
  Maximize,
  Music2,
  Pause,
  Play,
  Quote,
  SkipBack,
  SkipForward,
  Square,
  ThumbsUp
} from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  Share,
  StyleSheet,
  View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  Easing as ReEasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CreatePlaylistBottomSheet } from '@/components/library/CreatePlaylistBottomSheet';
import SeekSlider from '@/components/SliderSeek';
import { Typography as Text } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { toast, useDownloads, useFavorites, usePlaylists, useQueue } from '@/services';

import LyricsTab from '../lyrics/LyricsTab';
import MarqueeText from '../MarqueeText';
import QueueTab from '../QueueTab';

import { useTrackOptionsState } from '@/contexts/track-options/use-track-options-state';
import { AboutModal } from './dialogs/about-modal';
import { ArtistSheet } from './dialogs/artist-sheet';
import { DeviceModal } from './dialogs/device-modal';
import { MoreMenu } from './dialogs/more-menu';
import { PlaylistSelect } from './dialogs/playlist-select';
import { QualityModal } from './dialogs/quality-modal';
import { SleepTimerModal } from './dialogs/sleep-timer-modal';
import { StatsModal } from './dialogs/stats-modal';
import { useArtworkPalette } from './hooks/use-artwork-palette';
import { usePlayerSync } from './hooks/use-player-sync';
import { styles } from './styles';
import { TrackContentProps } from './types';

const { height } = Dimensions.get('window');

let globalPrevColors: string[] = ['#121212', '#000000'];
let globalCurrentColors: string[] = ['#121212', '#000000'];

export function TrackContent({
  track,
  queue: propQueue,
  isPlaying,
  isBuffering,
  position,
  duration,
  buffered = 0,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onSkipToTrack,
  repeatOn,
  onRepeat,
  panGesture,
  onCollapse,
  onVideoModeChange,
}: TrackContentProps) {
  const trackOptionsState = useTrackOptionsState();

  useEffect(() => {
    if (track && track.id !== 'no-track') {
      trackOptionsState.openTrackOptions(track);
    }
  }, [track]);

  const headerGesture = panGesture?.header || panGesture;
  const isLive = !!(track.id?.startsWith('radiogarden-') || track.album === 'Radio Garden');
  const artworkGesture = panGesture?.artwork || panGesture;
  const controlsGesture = panGesture?.controls || panGesture;

  const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
    Haptics.impactAsync(style).catch(() => { });
  };

  const handleSwipeNext = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onNext();
  };

  const handleSwipePrev = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    onPrev();
  };

  const artworkSwipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-30, 30])
    .onEnd((e) => {
      if (e.translationX < -50) {
        runOnJS(handleSwipeNext)();
      } else if (e.translationX > 50) {
        runOnJS(handleSwipePrev)();
      }
    });

  const queue = useQueue();
  const palette = useArtworkPalette(track.artwork as string | undefined, track, queue);
  const videoViewRef = useRef<VideoView>(null);

  const [bgColors, setBgColors] = useState<string[]>(globalCurrentColors);
  const [fgColors, setFgColors] = useState<string[]>(globalCurrentColors);
  const currentColorsRef = useRef<string[]>(globalCurrentColors);
  const transitionVal = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: transitionVal.value,
    };
  });

  const animationCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const nextColors = [palette[0] || '#121212', palette[2] || '#000000'];
    if (
      nextColors[0] === currentColorsRef.current[0] &&
      nextColors[1] === currentColorsRef.current[1]
    ) {
      return;
    }

    // Cancel any in-progress transition
    if (animationCancelRef.current) {
      animationCancelRef.current();
      animationCancelRef.current = null;
    }

    // Snapshot current as previous
    const snapshotPrev = currentColorsRef.current;
    globalPrevColors = snapshotPrev;
    globalCurrentColors = nextColors;
    currentColorsRef.current = nextColors;

    // Set foreground to next colors
    setFgColors(nextColors);
    // Reset opacity to 0 to prepare for fade in
    // eslint-disable-next-line react-hooks/immutability
    transitionVal.value = 0;

    let cancelled = false;
    animationCancelRef.current = () => { cancelled = true; };

     
    transitionVal.value = withTiming(
      1,
      { duration: 900, easing: ReEasing.inOut(ReEasing.cubic) },
      (finished) => {
        if (finished && !cancelled) {
          runOnJS(setBgColors)(nextColors);
          animationCancelRef.current = null;
        }
      },
    );
  }, [palette]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    transitionVal.value = 0;
  }, [bgColors]);

  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(track.id);
  const { playerStyle, colors: themeColors } = useAppTheme();

  const colors = useMemo(() => ({
    text: '#ffffff',
    mutedForeground: 'rgba(255,255,255,0.65)',
    card: 'rgba(0,0,0)',
    border: 'rgba(255,255,255,0.12)',
    primary: themeColors.primary,
    primaryForeground: themeColors.primaryForeground,
    background: '#121212',
  }), [themeColors.primary, themeColors.primaryForeground]);

  const [activeView, setActiveView] = useState<'artwork' | 'lyrics' | 'queue'>('artwork');

  const artworkOpacity = useSharedValue(1);
  const lyricsOpacity = useSharedValue(0);
  const queueOpacity = useSharedValue(0);

  useEffect(() => {
    artworkOpacity.value = withTiming(activeView === 'artwork' ? 1 : 0, { duration: 200 });
    lyricsOpacity.value = withTiming(activeView === 'lyrics' ? 1 : 0, { duration: 200 });
    queueOpacity.value = withTiming(activeView === 'queue' ? 1 : 0, { duration: 200 });
  }, [activeView]);

  const artworkAnimStyle = useAnimatedStyle(() => ({
    opacity: artworkOpacity.value,
    transform: [{ scale: 0.96 + 0.04 * artworkOpacity.value }],
  }));

  const lyricsAnimStyle = useAnimatedStyle(() => ({
    opacity: lyricsOpacity.value,
    transform: [{ scale: 0.96 + 0.04 * lyricsOpacity.value }],
  }));

  const queueAnimStyle = useAnimatedStyle(() => ({
    opacity: queueOpacity.value,
    transform: [{ scale: 0.96 + 0.04 * queueOpacity.value }],
  }));

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const router = useRouter();

  const { isDownloaded, startDownload, removeDownload, downloadingIds } = useDownloads();

  const handleDownloadClick = async () => {
    if (isDownloaded(track.id)) {
      removeDownload(track.id);
      setShowMoreMenu(false);
      toast.success(`Removed download for "${track.title}"`);
    } else {
      setShowMoreMenu(false);
      toast.info(`Downloading "${track.title}"...`);
      const success = await startDownload(track);
      if (success) {
        toast.success(`"${track.title}" added to downloads`);
      } else {
        toast.error(`Failed to download "${track.title}"`);
      }
    }
  };

  const handleArtistPress = () => {
    if (track.artists && track.artists.length > 1) {
      setArtistOptions(track.artists);
      setShowArtistSheet(true);
    } else {
      onCollapse();
      if (track.artists && track.artists.length === 1 && track.artists[0].id) {
        router.push(`/artist/${track.artists[0].id}` as any);
      } else if (track.artistId) {
        router.push(`/artist/${track.artistId}` as any);
      } else {
        router.push({ pathname: '/(tabs)/explore', params: { query: track.artist } } as any);
      }
    }
  };

  const {
    playerMode,
    setPlayerMode,
    isVideoPlaying,
    videoTime,
    videoPlayer,
    changeAudioQuality,
    changeVideoQuality,
  } = usePlayerSync(track, position, isPlaying, onPlayPause, onVideoModeChange);



  const { playlists, addTrackToPlaylist } = usePlaylists();
  const [showPlaylistSelectModal, setShowPlaylistSelectModal] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showArtistSheet, setShowArtistSheet] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [artistOptions, setArtistOptions] = useState<{ name: string; id: string }[]>([]);

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    setShowPlaylistSelectModal(false);
    const success = await addTrackToPlaylist(playlistId, track);
    if (success) {
      alert(`Added to "${playlistName}"`);
    } else {
      alert(`"${track.title}" is already in "${playlistName}"`);
    }
  };

  const handleShare = async () => {
    setShowMoreMenu(false);
    try {
      if (isLive) {
        const channelId = track.id.startsWith('radiogarden-') ? track.id.substring(12) : track.id;
        const shareUrl = track.website || `https://radio.garden/listen/station/${channelId}`;
        await Share.share({
          message: `Tune in to "${track.title}" (${track.artist}) on Radio Garden: ${shareUrl}`,
        });
      } else {
        const videoId = track.id.startsWith('yt-') ? track.id.substring(3) : track.id;
        await Share.share({
          message: `Listen to "${track.title}" by ${track.artist}: https://music.youtube.com/watch?v=${videoId}`,
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  return (
    <View style={styles.root}>
      {playerStyle === 'solid' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#121212' }]} />
      ) : (
        <>
          <LinearGradient
            colors={bgColors as [string, string]}
            style={StyleSheet.absoluteFill}
          />
          <Reanimated.View style={[animatedStyle, StyleSheet.absoluteFill]}>
            <LinearGradient
              colors={fgColors as [string, string]}
              style={StyleSheet.absoluteFill}
            />
          </Reanimated.View>
        </>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <GestureDetector gesture={headerGesture}>
          <View style={styles.topHeader}>
            <View style={styles.modeToggleCapsule}>
              <Pressable
                android_ripple={{
                  color: '#ffffff40',
                  foreground: true,
                }}
                onPress={() => {
                  setActiveView('artwork');
                  setPlayerMode('audio');
                }}
                style={[styles.modeToggleBtn, playerMode === 'audio' && styles.modeToggleBtnActive]}
              >
                <Music2 size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <Pressable
                disabled={!track.videoUrl}
                android_ripple={{
                  color: '#ffffff40',
                  foreground: true,
                }}
                onPress={() => {
                  if (track.videoUrl) {
                    setActiveView('artwork');
                    setPlayerMode('video');
                  }
                }}
                style={[
                  styles.modeToggleBtn,
                  playerMode === 'video' && styles.modeToggleBtnActive,
                  !track.videoUrl && { opacity: 0.35 },
                ]}
              >
                <Film size={16} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>
          </View>
        </GestureDetector>

        <View style={styles.artworkSection}>
          <Reanimated.View
            pointerEvents={activeView === 'lyrics' ? 'auto' : 'none'}
            style={[StyleSheet.absoluteFill, lyricsAnimStyle]}
          >
            <LyricsTab
              key={track.id}
              track={track}
              activePosition={playerMode === 'video' ? videoTime : position}
              activePlaying={playerMode === 'video' ? isVideoPlaying : isPlaying}
              onSeek={(time) => {
                if (playerMode === 'video') {
                  // eslint-disable-next-line react-hooks/immutability
                  videoPlayer.currentTime = time;
                } else {
                  onSeek(time);
                }
              }}
              primaryColor={colors.primary}
              isVisible={activeView === 'lyrics'}
            />
          </Reanimated.View>

          <Reanimated.View
            pointerEvents={activeView === 'queue' ? 'auto' : 'none'}
            style={[StyleSheet.absoluteFill, queueAnimStyle]}
          >
            <QueueTab
              track={track}
              onSkipToTrack={onSkipToTrack}
              primaryColor={colors.primary}
              isVisible={activeView === 'queue'}
            />
          </Reanimated.View>

          <Reanimated.View
            pointerEvents={activeView === 'artwork' ? 'auto' : 'none'}
            style={[StyleSheet.absoluteFill, artworkAnimStyle, { justifyContent: 'center', alignItems: 'center' }]}
          >
            <GestureDetector gesture={Gesture.Exclusive(artworkSwipeGesture, artworkGesture)}>
              <View style={[styles.artworkWrap, playerMode === 'video' && { aspectRatio: 16 / 9, maxHeight: height * 0.28 }]}>
                {playerMode === 'video' && track.videoUrl ? (
                  <View style={styles.videoContainer}>
                    <VideoView
                      ref={videoViewRef}
                      player={videoPlayer}
                      style={styles.videoPlayer}
                      contentFit="contain"
                      nativeControls={false}
                      fullscreenOptions={{ enable: true, orientation: 'landscape' }}
                    />
                    {isVideoPlaying === false && (
                      <View style={styles.videoBufferOverlay} pointerEvents="none">
                        <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
                      </View>
                    )}
                    <View style={styles.videoTopBar}>
                      <Pressable
                        android_ripple={{ foreground: true, color: '#ffffff40', radius: 16 }}
                        onPress={() => videoViewRef.current?.enterFullscreen()}
                        style={styles.fullscreenBtn}
                      >
                        <Maximize size={15} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <Image
                      source={
                        track.artwork && (track.artwork as string).trim() !== ''
                          ? { uri: track.artwork as string }
                          : require('@/assets/images/icon.png')
                      }
                      style={styles.artwork}
                    />
                    {isBuffering && (
                      <View style={styles.bufferOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                      </View>
                    )}
                  </>
                )}
              </View>
            </GestureDetector>
          </Reanimated.View>
        </View>

        <GestureDetector gesture={controlsGesture}>
          <View style={styles.bottomSheet}>
            <View style={styles.metadataRow}>
              <View style={styles.metadataInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' }}>
                  <MarqueeText
                    speed={15}
                    isExplicit={track.explicit}
                    explicitBadgeStyle={{
                      backgroundColor: 'rgba(255,255,255,0.65)',
                      color: '#000',
                    }}
                    style={styles.titleText}
                  >
                    {track.title}
                  </MarqueeText>
                </View>
                <Pressable
                  android_ripple={{
                    color: colors.border,
                    foreground: true,
                  }}
                  onPress={handleArtistPress}
                  disabled={isLive}
                  style={{ width: '100%' }}
                >
                  <MarqueeText speed={15} style={styles.artistText}>
                    {track.artist}
                  </MarqueeText>
                </Pressable>
              </View>
              <View style={styles.metadataActions}>
                <Pressable
                  android_ripple={{
                    color: '#FF3B3080',
                    foreground: true,
                  }}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => toggleFavorite(track)}
                  style={{ ...styles.metaCircleBtn, backgroundColor: isFav ? '#FF3B3090' : 'rgba(255,255,255,0.1)' }}
                >
                  <ThumbsUp size={18} color="rgba(255,255,255,0.8)" />
                </Pressable>
                <Pressable
                  android_ripple={{
                    color: colors.border,
                    foreground: true,
                  }}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => {
                    setShowMoreMenu(true);
                  }}
                  style={{ ...styles.metaCircleBtn, backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <Ellipsis size={18} color="rgba(255,255,255,0.8)" />
                </Pressable>
              </View>
            </View>

            <View style={styles.seekSection}>
              {isLive ? (
                <View style={{ height: 4, width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 }} />
              ) : (
                <SeekSlider
                  position={playerMode === 'video' ? videoTime : position}
                  duration={duration}
                  buffered={buffered}
                  onSeek={(time) => {
                    if (playerMode === 'video') {
                      // eslint-disable-next-line react-hooks/immutability
                      videoPlayer.currentTime = time;
                    } else {
                      onSeek(time);
                    }
                  }}
                  trackHeight={8}
                  thumbSize={0}
                  thumbSizeActive={0}
                  showTimestamps={false}
                  colorFilled="rgba(255,255,255,0.8)"
                  colorUnfilled="rgba(255,255,255,0.2)"
                />
              )}

              <View style={styles.timeLabels}>
                <Text style={styles.timeText}>
                  {new Date((playerMode === 'video' ? videoTime : position) * 1000).toISOString().substr(14, 5)}
                </Text>
                {isLive ? (
                  <Pressable
                    onPress={() => {
                      if (typeof duration === 'number' && duration > 0) {
                        onSeek(duration);
                        toast.success('Seeking to Live');
                      }
                    }}
                    android_ripple={{ color: 'rgba(255,255,255,0.25)', borderless: true, radius: 24 }}
                    style={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30', marginRight: 4 }} />
                    <Text style={{ color: '#FF3B30', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>LIVE</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.timeText}>
                    -{new Date((duration - (playerMode === 'video' ? videoTime : position)) * 1000).toISOString().substr(14, 5)}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.transportRow}>
              <Pressable
                android_ripple={{
                  foreground: true,
                  borderless: true,
                  color: colors.border,
                  radius: 36,
                }}
                className="active:scale-95"
                hitSlop={10}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                  onPrev();
                }}
                style={styles.transportBtn}
              >
                <SkipBack fill="#fff" strokeWidth={3} size={36} color="#fff" />
              </Pressable>
              <Pressable
                android_ripple={{
                  foreground: true,
                  borderless: true,
                  color: colors.border,
                  radius: 45,
                }}
                hitSlop={10}
                className="active:scale-95"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
                  if (playerMode === 'video') {
                    if (isVideoPlaying) {
                      videoPlayer.pause();
                    } else {
                      videoPlayer.play();
                    }
                  } else {
                    onPlayPause();
                  }
                }}
                style={styles.mainPlayBtn}
              >
                {playerMode === 'video' ? (
                  isVideoPlaying ? (
                    <Square fill="#fff" size={52} strokeWidth={0} />
                  ) : (
                    <Play fill="#fff" size={52} strokeWidth={0} />
                  )
                ) : isPlaying ? (
                  <Pause fill="#fff" size={52} strokeWidth={0} />
                ) : (
                  <Play fill="#fff" size={52} strokeWidth={0} />
                )}
              </Pressable>
              <Pressable
                android_ripple={{
                  foreground: true,
                  borderless: true,
                  color: colors.border,
                  radius: 35,
                }}
                hitSlop={10}
                className="active:scale-95"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                  onNext();
                }}
                style={styles.transportBtn}
              >
                <SkipForward fill="#fff" strokeWidth={3} size={36} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.utilityBar}>
              <Pressable
                onPress={() => setActiveView(activeView === 'lyrics' ? 'artwork' : 'lyrics')}
                style={{
                  ...styles.utilityBtn,
                  backgroundColor: activeView === 'lyrics' ? 'rgba(255,255,255,0.2)' : 'transparent',
                }}
              >
                <Quote
                  size={22}
                  fill={activeView === 'lyrics' ? 'rgba(255,255,255)' : 'rgba(255,255,255,0.6)'}
                  strokeWidth={0}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowDeviceModal(true);
                }}
                style={styles.utilityBtn}
              >
                <Cast size={22} color="rgba(255,255,255,0.6)" />
              </Pressable>
              <Pressable
                onPress={() => setActiveView(activeView === 'queue' ? 'artwork' : 'queue')}
                style={{
                  ...styles.utilityBtn,
                  backgroundColor: activeView === 'queue' ? 'rgba(255,255,255,0.2)' : 'transparent',
                }}
              >
                <ListMusic size={22} fill={activeView === 'queue' ? 'rgba(255,255,255)' : 'rgba(255,255,255,0.6)'} color={activeView === 'queue' ? 'rgba(255,255,255)' : 'rgba(255,255,255,0.6)'} />
              </Pressable>
            </View>
          </View>
        </GestureDetector>
      </SafeAreaView>

      <DeviceModal
        visible={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        playerMode={playerMode}
        track={track}
        onQualityPress={() => {
          setShowDeviceModal(false);
          setTimeout(() => {
            setShowQualityModal(true);
          }, 300);
        }}
      />

      <MoreMenu
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        track={track}
        isFav={isFav}
        isLive={isLive}
        repeatOn={repeatOn}
        onRepeat={onRepeat}
        downloadingIds={downloadingIds}
        isDownloaded={isDownloaded}
        toggleFavorite={toggleFavorite}
        handleDownloadClick={handleDownloadClick}
        handleShare={handleShare}
        setShowPlaylistSelectModal={setShowPlaylistSelectModal}
        setShowAboutModal={setShowAboutModal}
        setShowQualityModal={setShowQualityModal}
        setShowStatsModal={setShowStatsModal}
        setShowSleepTimerModal={setShowSleepTimerModal}
        trackOptionsState={trackOptionsState}
        handleArtistPress={handleArtistPress}
      />

      <PlaylistSelect
        visible={showPlaylistSelectModal}
        onClose={() => setShowPlaylistSelectModal(false)}
        playlists={playlists}
        onSelectPlaylist={handleAddToPlaylist}
        onCreateNewPlaylist={() => {
          setShowPlaylistSelectModal(false);
          setTimeout(() => setShowCreatePlaylistModal(true), 250);
        }}
      />

      <CreatePlaylistBottomSheet
        visible={showCreatePlaylistModal}
        onClose={() => setShowCreatePlaylistModal(false)}
        buttonText="Create & Add"
        onCreateSuccess={async (newPlaylist) => {
          await addTrackToPlaylist(newPlaylist.id, track);
          alert(`Playlist created and "${track.title}" added!`);
        }}
      />

      <AboutModal
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        track={track}
        isLive={isLive}
        handleArtistPress={handleArtistPress}
      />

      <QualityModal
        visible={showQualityModal}
        onClose={() => setShowQualityModal(false)}
        track={track}
        playerMode={playerMode}
        isLive={isLive}
        changeAudioQuality={changeAudioQuality}
        changeVideoQuality={changeVideoQuality}
      />

      <ArtistSheet
        visible={showArtistSheet}
        onClose={() => setShowArtistSheet(false)}
        artistOptions={artistOptions}
        onSelectArtist={(artistId) => {
          onCollapse();
          router.push(`/artist/${artistId}` as any);
        }}
      />

      <StatsModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        track={track}
      />

      <SleepTimerModal
        visible={showSleepTimerModal}
        onClose={() => setShowSleepTimerModal(false)}
      />
    </View>
  );
}
export default TrackContent;
