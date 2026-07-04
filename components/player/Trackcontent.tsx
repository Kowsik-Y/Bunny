import { CreatePlaylistBottomSheet } from '@/components/library/CreatePlaylistBottomSheet';
import SeekSlider from '@/components/SliderSeek';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography as Text } from '@/components/ui/typography';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { toast, useDownloads, useFavorites, usePlaylists, useQueue } from '@/services';
import { setVideoQualityChanging } from '@/services/PlaybackService';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ellipsis, Film, Heart, List, Music2, Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  NativeModules, Platform,
  Pressable,
  Share,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ImageColors from 'react-native-image-colors';
import Reanimated, {
  Easing as ReEasing,
  runOnJS,
  useSharedValue,
  withTiming,
  useAnimatedStyle
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';
import LyricsTab from './lyrics/LyricsTab';
import MarqueeText from './MarqueeText';
import QueueTab from './QueueTab';
import { BottomSheetScrollView, SwipeBottomSheet } from './SwipeBottomSheet';
import { type AppTrack } from './Tracks';

const { width, height } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// Palette extraction hook
// ─────────────────────────────────────────────────────────────
type Palette = [string, string, string, string];
const FALLBACK: Palette = ['#121212', '#181818', '#000000', '#0a0a0a'];

// Module-level variables to persist colors across component remounts
let globalPrevColors: string[] = ['#121212', '#000000'];
let globalCurrentColors: string[] = ['#121212', '#000000'];
let globalPalette: Palette = FALLBACK;
const globalCache: Record<string, Palette> = {};

function useArtworkPalette(uri?: string): Palette {
  const [palette, setPalette] = useState<Palette>(globalPalette);

  useEffect(() => {
    console.log('[useArtworkPalette] uri changed:', uri);
    if (!uri) return;
    if (globalCache[uri]) {
      console.log('[useArtworkPalette] cache hit for uri:', uri, globalCache[uri]);
      globalPalette = globalCache[uri];
      setPalette(globalCache[uri]);
      return;
    }
    console.log('[useArtworkPalette] fetching colors for uri:', uri);
    ImageColors.getColors(uri, {
      fallback: FALLBACK[0],
      cache: true,
      key: uri,
    })
      .then((colors) => {
        let newPalette: Palette;
        if (colors.platform === 'android' || colors.platform === 'web') {
          const c0 = colors.vibrant ?? colors.lightVibrant;
          const c1 = colors.lightVibrant ?? colors.vibrant;
          const c2 = colors.muted ?? colors.darkMuted;
          const c3 = colors.lightMuted;
          if (!c0 || !c2) return;
          newPalette = [c0, c1 ?? c0, c2, c3 ?? c2];
        } else if (colors.platform === 'ios') {
          const c0 = colors.primary;
          const c1 = colors.secondary;
          const c2 = colors.background;
          const c3 = colors.detail;
          if (!c0 || !c2) return;
          newPalette = [c0, c1 ?? c0, c2, c3 ?? c2];
        } else {
          return;
        }
        console.log('[useArtworkPalette] fetched new palette for uri:', uri, newPalette);
        globalCache[uri] = newPalette;
        globalPalette = newPalette;
        setPalette(newPalette);
      })
      .catch((err) => console.log('[useArtworkPalette] fetch error:', err));
  }, [uri]);

  return palette;
}


// ─────────────────────────────────────────────────────────────
// Main TrackContent
// ─────────────────────────────────────────────────────────────
type Props = {
  track: AppTrack;
  queue: AppTrack[];
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  buffered?: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (pos: number) => void;
  onSkipToTrack: (id: string) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  shuffleOn: boolean;
  repeatOn: boolean;
  panGesture: any;
  onCollapse: () => void;
  /** Called whenever the player switches between audio/video mode.
   *  Provides an isVideo flag and the correct playPause handler for
   *  the active player so the mini-player can stay in sync. */
  onVideoModeChange?: (info: { isVideo: boolean; playPause: () => void }) => void;
};


const TrackContent = ({
  track, queue: propQueue, isPlaying, isBuffering,
  position, duration, buffered = 0,
  onPlayPause, onNext, onPrev, onSeek, onSkipToTrack,
  panGesture, onCollapse, onVideoModeChange,
}: Props) => {
  const headerGesture = panGesture?.header || panGesture;
  const isLive = !!(track.id?.startsWith('radiogarden-') || track.album === 'Radio Garden');
  const artworkGesture = panGesture?.artwork || panGesture;
  const controlsGesture = panGesture?.controls || panGesture;


  const artworkSwipeGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .failOffsetY([-30, 30])
    .onEnd((e) => {
      if (e.translationX < -50) {
        runOnJS(onNext)();
      } else if (e.translationX > 50) {
        runOnJS(onPrev)();
      }
    });

  const queue = useQueue();
  const palette = useArtworkPalette(track.artwork as string | undefined);

  const [prevColors, setPrevColors] = useState<string[]>(globalPrevColors);
  const [currentColors, setCurrentColors] = useState<string[]>(globalCurrentColors);
  const currentColorsRef = useRef<string[]>(globalCurrentColors);
  const transitionVal = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: transitionVal.value,
    };
  });

  useEffect(() => {
    console.log('[TrackContent] Mounted');
    return () => console.log('[TrackContent] Unmounted');
  }, []);

  // Pre-fetch colors for adjacent tracks in the queue to make transitions instant
  useEffect(() => {
    if (!queue || queue.length === 0 || !track) return;
    const currentIndex = queue.findIndex((t) => t.id === track.id);
    if (currentIndex === -1) return;

    // Helper to pre-fetch a track's colors
    const prefetchTrack = (targetTrack: AppTrack) => {
      if (targetTrack && targetTrack.artwork) {
        const targetUri = targetTrack.artwork as string;
        if (!globalCache[targetUri]) {
          console.log('[TrackContent] Pre-fetching colors for:', targetTrack.title);
          ImageColors.getColors(targetUri, {
            fallback: FALLBACK[0],
            cache: true,
            key: targetUri,
          })
            .then((colors) => {
              let newPalette: Palette;
              if (colors.platform === 'android' || colors.platform === 'web') {
                const c0 = colors.vibrant ?? colors.lightVibrant;
                const c1 = colors.lightVibrant ?? colors.vibrant;
                const c2 = colors.muted ?? colors.darkMuted;
                const c3 = colors.lightMuted;
                if (!c0 || !c2) return;
                newPalette = [c0, c1 ?? c0, c2, c3 ?? c2];
              } else if (colors.platform === 'ios') {
                const c0 = colors.primary;
                const c1 = colors.secondary;
                const c2 = colors.background;
                const c3 = colors.detail;
                if (!c0 || !c2) return;
                newPalette = [c0, c1 ?? c0, c2, c3 ?? c2];
              } else {
                return;
              }
              globalCache[targetUri] = newPalette;
            })
            .catch(() => {});
        }
      }
    };

    // Pre-fetch next track
    if (currentIndex + 1 < queue.length) {
      prefetchTrack(queue[currentIndex + 1]);
    }
    // Pre-fetch previous track
    if (currentIndex - 1 >= 0) {
      prefetchTrack(queue[currentIndex - 1]);
    }
  }, [track.id, queue]);

  useEffect(() => {
    const nextColors = [palette[0] || '#121212', palette[2] || '#000000'];
    console.log('[TrackContent] palette changed:', palette, 'nextColors:', nextColors, 'currentColorsRef.current:', currentColorsRef.current);
    if (nextColors[0] === currentColorsRef.current[0] && nextColors[1] === currentColorsRef.current[1]) {
      return;
    }
    globalPrevColors = currentColorsRef.current;
    globalCurrentColors = nextColors;
    setPrevColors(currentColorsRef.current);
    currentColorsRef.current = nextColors;
    setCurrentColors(nextColors);
    transitionVal.value = 0;
    transitionVal.value = withTiming(1, { duration: 1000, easing: ReEasing.inOut(ReEasing.ease) });
  }, [palette]);
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(track.id);
  const { playerStyle, lyricsSize, lyricsSpacing, colors: themeColors } = useAppTheme();

  // The expanded player UI is always dark-themed (white text and controls)
  // to guarantee contrast against the dark gradient artwork background.
  const colors = useMemo(() => ({
    text: '#ffffff',
    mutedForeground: 'rgba(255,255,255,0.65)',
    card: 'rgba(0,0,0)',
    border: 'rgba(255,255,255,0.12)',
    primary: themeColors.primary,
    primaryForeground: themeColors.primaryForeground,
    background: '#121212',
  }), [themeColors.primary, themeColors.primaryForeground]);

  // Mode switching: artwork, lyrics, queue
  const [activeView, setActiveView] = useState<'artwork' | 'lyrics' | 'queue'>('artwork');

  // Shared values for tab switching animations
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
  const [activeDevice, setActiveDevice] = useState('Phone Speakers');
  const router = useRouter();
  const deviceSheetRef = useRef<BottomSheetModal>(null);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    []
  );


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
        toast.success(`"${track.title}" downloaded offline!`);
      } else {
        toast.error(`Failed to download "${track.title}"`);
      }
    }
  };

  const handleArtistPress = () => {
    onCollapse();
    if (track.artists && track.artists.length > 1) {
      setArtistOptions(track.artists);
      setShowArtistSheet(true);
    } else if (track.artistId) {
      router.push(`/artist/${track.artistId}` as any);
    } else {
      router.push({ pathname: '/(tabs)/explore', params: { query: track.artist } } as any);
    }
  };

  const changeAudioQuality = async (formatUrl: string, itag: number) => {
    try {
      const progress = await TrackPlayer.getProgress();
      const currentPos = progress.position;
      const isCurrentlyPlaying = (await TrackPlayer.getPlaybackState()).state === 'playing';

      await TrackPlayer.pause();

      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (activeIndex !== undefined && activeIndex !== null && activeIndex >= 0) {
        const queue = await TrackPlayer.getQueue();
        const currentTrackObj = queue[activeIndex];
        const updatedTrack = {
          ...currentTrackObj,
          url: formatUrl,
          activeItag: itag,
        };
        await TrackPlayer.add([updatedTrack], activeIndex);
        await TrackPlayer.skip(activeIndex);
        await TrackPlayer.remove(activeIndex + 1);

        if (currentPos > 0) {
          await TrackPlayer.seekTo(currentPos);
        }

        if (isCurrentlyPlaying) {
          await TrackPlayer.play();
        }
        toast.success('Audio quality updated successfully!');
      }
    } catch (e: any) {
      console.error('Failed to change audio quality:', e);
      toast.error('Failed to change audio quality');
    }
  };

  const changeVideoQuality = async (formatUrl: string, itag: number) => {
    // Capture a stable reference before any async work — avoids the "already
    // released" error when the player is torn down mid-flight.
    const player = videoPlayer;
    try {
      const currentPos = player.currentTime;
      const isCurrentlyPlaying = isVideoPlaying;

      player.pause();

      // Tell PlaybackService NOT to call TrackPlayer.play() when it sees the
      // track-changed event fired by TrackPlayer.skip() below. Without this,
      // TrackPlayer would resume and steal audio focus from expo-video.
      setVideoQualityChanging(true);

      try {
        const activeIndex = await TrackPlayer.getActiveTrackIndex();
        if (activeIndex !== undefined && activeIndex !== null && activeIndex >= 0) {
          const queue = await TrackPlayer.getQueue();
          const currentTrackObj = queue[activeIndex];
          const updatedTrack = {
            ...currentTrackObj,
            videoUrl: formatUrl,
            activeVideoItag: itag,
          };
          await TrackPlayer.add([updatedTrack], activeIndex);
          await TrackPlayer.skip(activeIndex);
          await TrackPlayer.remove(activeIndex + 1);
          // Make sure TrackPlayer stays paused — PlaybackService might have
          // re-queued a play() before our flag was checked.
          await TrackPlayer.pause();
        }
      } finally {
        // Always clear the flag so normal track changes work again.
        setVideoQualityChanging(false);
      }

      // Use replaceAsync so expo-video fully initialises the new source before
      // we attempt to seek — prevents the "cannot use shared object already
      // released" crash that fires when replace() is still mid-teardown.
      await player.replaceAsync(formatUrl);

      // After replaceAsync the player is ready — restore audio state (replaceAsync
      // resets muted/volume on Android) then seek and resume.
      try {
        player.muted = false;
        player.volume = 1;
        player.currentTime = currentPos;
        if (isCurrentlyPlaying) {
          player.play();
        }
      } catch (seekErr: any) {
        // Player was released between quality change and seek (e.g. track
        // changed while quality selector was open). Safe to ignore.
        console.warn('[changeVideoQuality] Seek after replace failed (player released):', seekErr?.message);
      }

      toast.success('Video quality updated successfully!');
    } catch (e: any) {
      setVideoQualityChanging(false); // safety reset on outer error
      console.error('Failed to change video quality:', e);
      toast.error('Failed to change video quality');
    }
  };


  // Player modes: 'audio' or 'video'
  const [playerMode, setPlayerMode] = useState<'audio' | 'video'>('audio');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(position);
  const videoViewRef = useRef<any>(null);
  const [realDevices, setRealDevices] = useState<{ name: string, type: string, id: number }[]>([]);

  // Load and refresh audio routing devices & active status
  const refreshAudioRouting = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const devices: any[] = []
        if (Array.isArray(devices) && devices.length > 0) {
          const seen = new Set<string>();
          const unique = devices.filter((d) => {
            if (!d || !d.name || seen.has(d.name)) return false;
            seen.add(d.name);
            return true;
          });
          setRealDevices(unique);
        }
      } catch (e) {
        console.warn('[AudioRouting] Failed to refresh:', e);
      }
    }
  }, []);

  useEffect(() => {
    refreshAudioRouting();
    const interval = setInterval(refreshAudioRouting, 3000);
    return () => clearInterval(interval);
  }, [refreshAudioRouting, showDeviceModal]);

  // Initialize expo-video player
  const videoPlayer = useVideoPlayer(track.videoUrl ?? '', (player) => {
    player.loop = false;
    player.muted = false;
  });

  // Playlists States
  const { playlists, addTrackToPlaylist } = usePlaylists();
  const [showPlaylistSelectModal, setShowPlaylistSelectModal] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showArtistSheet, setShowArtistSheet] = useState(false);
  const [artistOptions, setArtistOptions] = useState<Array<{ name: string; id: string }>>([]);

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    setShowPlaylistSelectModal(false);
    const success = await addTrackToPlaylist(playlistId, track);
    if (success) {
      alert(`Added to "${playlistName}"`);
    } else {
      alert(`"${track.title}" is already in "${playlistName}"`);
    }
  };

  // Track video status
  useEffect(() => {
    const subscription = videoPlayer.addListener('playingChange', (event: any) => {
      setIsVideoPlaying(!!event?.isPlaying);
    });
    return () => subscription.remove();
  }, [videoPlayer]);

  // Synchronize playback between TrackPlayer and expo-video
  useEffect(() => {
    if (playerMode === 'video') {
      // Pause track player, play video at current track position
      TrackPlayer.pause().then(() => {
        videoPlayer.currentTime = position;
        if (isPlaying) {
          videoPlayer.play();
        } else {
          videoPlayer.pause();
        }
      }).catch(() => {
        videoPlayer.currentTime = position;
      });
    } else {
      // Pause video, sync back to TrackPlayer
      videoPlayer.pause();
      const videoCurrentTime = videoPlayer.currentTime;
      if (videoCurrentTime > 0 && Math.abs(videoCurrentTime - position) > 1.0) {
        TrackPlayer.seekTo(videoCurrentTime).then(() => {
          if (isVideoPlaying) {
            TrackPlayer.play();
          }
        });
      } else if (isVideoPlaying && !isPlaying) {
        TrackPlayer.play();
      }
    }
  }, [playerMode]);

  // Track video player currentTime updates
  useEffect(() => {
    if (playerMode !== 'video') return;
    const interval = setInterval(() => {
      setVideoTime(videoPlayer.currentTime);
    }, 250);
    return () => clearInterval(interval);
  }, [playerMode, videoPlayer]);

  // Notify parent about video mode changes so the mini-player can
  // route its play/pause button to the correct underlying player.
  useEffect(() => {
    if (!onVideoModeChange) return;
    if (playerMode === 'video') {
      onVideoModeChange({
        isVideo: true,
        playPause: () => {
          if (videoPlayer.playing) {
            videoPlayer.pause();
          } else {
            videoPlayer.play();
          }
        },
      });
    } else {
      onVideoModeChange({ isVideo: false, playPause: onPlayPause });
    }
  }, [playerMode, videoPlayer, onPlayPause, onVideoModeChange]);

  // Reset state on track change
  useEffect(() => {
    setPlayerMode('audio');
    // Use replaceAsync to avoid the "shared object already released" error
    // that can fire when tracks change rapidly and the player is mid-teardown.
    videoPlayer.replaceAsync(track.videoUrl ?? '').then(() => {
      // Restore audio properties — replaceAsync resets muted/volume on Android.
      try {
        videoPlayer.muted = false;
        videoPlayer.volume = 1;
      } catch (_) { }
    }).catch((err: any) => {
      console.warn('[videoPlayer] replaceAsync on track change failed:', err?.message);
    });
  }, [track.id]);


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
          {/* Base Layer: Previous Colors */}
          <LinearGradient
            colors={prevColors as [string, string]}
            style={StyleSheet.absoluteFill}
          />
          {/* Transition Layer: Current Colors fading in */}
          <Reanimated.View style={[animatedStyle, StyleSheet.absoluteFill]}>
            <LinearGradient
              colors={currentColors as [string, string]}
              style={StyleSheet.absoluteFill}
            />
          </Reanimated.View>
        </>
      )}

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Header / Drag Zone */}
        <GestureDetector gesture={headerGesture}>
          <View style={styles.topHeader}>

            {/* Song / Video Switch capsule */}
            <View style={styles.modeToggleCapsule}>
              <Pressable
                android_ripple={{
                  color: "#ffffff40",
                  foreground: true,
                }}
                onPress={() => {
                  setActiveView("artwork");
                  setPlayerMode('audio')
                }}
                style={[styles.modeToggleBtn, playerMode === 'audio' && styles.modeToggleBtnActive]}
              >
                <Music2 size={16} color={playerMode === 'audio' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.7)'} />
              </Pressable>
              <Pressable
                disabled={!track.videoUrl}
                android_ripple={{
                  color: "#ffffff40",
                  foreground: true,
                }}
                onPress={() => {
                  if (track.videoUrl) {
                    setActiveView("artwork");
                    setPlayerMode('video');
                  }
                }}
                style={[
                  styles.modeToggleBtn,
                  playerMode === 'video' && styles.modeToggleBtnActive,
                  !track.videoUrl && { opacity: 0.35 }
                ]}
              >
                <Film size={16} color={playerMode === 'video' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.7)'} />
              </Pressable>
            </View>
          </View>
        </GestureDetector>

        {/* Main Section */}
        <View style={styles.artworkSection}>
          <Reanimated.View
            pointerEvents={activeView === 'lyrics' ? 'auto' : 'none'}
            style={[StyleSheet.absoluteFill, lyricsAnimStyle]}
          >
            <LyricsTab
              track={track}
              activePosition={playerMode === 'video' ? videoTime : position}
              activePlaying={playerMode === 'video' ? isVideoPlaying : isPlaying}
              onSeek={(time) => {
                if (playerMode === 'video') {
                  videoPlayer.currentTime = time;
                  setVideoTime(time);
                } else {
                  onSeek(time);
                }
              }}
              primaryColor={colors.primary}
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
                    />

                    {/* Buffering spinner */}
                    {isVideoPlaying === false && (
                      <View style={styles.videoBufferOverlay} pointerEvents="none">
                        <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
                      </View>
                    )}

                    {/* Top-right overlay: quality pills + fullscreen */}
                    <View style={styles.videoTopBar}>
                      <Pressable
                        android_ripple={{ foreground: true, color: '#ffffff40', radius: 16 }}
                        onPress={() => videoViewRef.current?.enterFullscreen()}
                        style={styles.fullscreenBtn}
                      >
                        <Feather name="maximize" size={15} color="#fff" />
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <>
                    <Image
                      source={track.artwork && (track.artwork as string).trim() !== '' ? { uri: track.artwork as string } : require('@/assets/images/icon.png')}
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

        {/* Control & Details Section */}
        <GestureDetector gesture={controlsGesture}>
          <View style={styles.bottomSheet}>
            {/* Metadata Row */}
            <View style={styles.metadataRow}>
              <View style={styles.metadataInfo}>
                <MarqueeText style={styles.titleText} speed={35} pauseMs={1200}>{track.title}</MarqueeText>
                <Pressable
                  android_ripple={{
                    color: colors.border,
                    foreground: true
                  }}
                  onPress={handleArtistPress}
                  disabled={isLive}
                  style={{ width: '100%' }}
                >
                  <MarqueeText style={styles.artistText} speed={30} pauseMs={1200}>
                    {track.artist}
                  </MarqueeText>
                </Pressable>
              </View>
              <View style={styles.metadataActions}>
                <Pressable
                  android_ripple={{
                    color: '#FF3B3080',
                    foreground: true
                  }}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => toggleFavorite(track)}
                  style={{ ...styles.metaCircleBtn, backgroundColor: isFav ? '#FF3B3090' : 'rgba(255,255,255,0.1)' }}
                >
                  <Heart
                    size={18}
                    color={'rgba(255,255,255,0.8)'}
                  />
                </Pressable>
                <Pressable
                  android_ripple={{
                    color: colors.border,
                    foreground: true
                  }}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  onPress={() => setShowMoreMenu(true)}
                  style={{ ...styles.metaCircleBtn, backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <Ellipsis size={18} color="rgba(255,255,255,0.8)" />
                </Pressable>
              </View>
            </View>

            {/* Seek Bar */}
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
                      videoPlayer.currentTime = time;
                      setVideoTime(time);
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

              {isLive ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30', marginRight: 6 }} />
                  <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>LIVE</Text>
                </View>
              ) : (
                <View style={styles.timeLabels}>
                  <Text style={styles.timeText}>
                    {new Date((playerMode === 'video' ? videoTime : position) * 1000).toISOString().substr(14, 5)}
                  </Text>
                  <Text style={styles.timeText}>
                    -{new Date((duration - (playerMode === 'video' ? videoTime : position)) * 1000).toISOString().substr(14, 5)}
                  </Text>
                </View>
              )}
            </View>

            {/* Playback Controls */}
            <View style={styles.transportRow}>
              <Pressable
                android_ripple={{
                  foreground: true,
                  borderless: true,
                  color: colors.border,
                  radius: 36
                }}
                className='active:scale-95'
                hitSlop={10}
                onPress={onPrev} style={styles.transportBtn}>
                <SkipBack
                  fill="#fff"
                  strokeWidth={3}
                  size={36} color="#fff" />
              </Pressable>
              <Pressable
                android_ripple={{
                  foreground: true,
                  borderless: true,
                  color: colors.border,
                  radius: 45
                }}
                hitSlop={10}
                className='active:scale-95'
                onPress={() => {
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
                {
                  playerMode === 'video' ? (
                    isVideoPlaying ? (
                      <Square
                        fill="#fff"
                        size={52}
                        strokeWidth={0} />
                    ) : (
                      <Play fill="#fff"
                        size={52}
                        strokeWidth={0} />
                    )
                  ) : (
                    isPlaying ? (
                      <Pause
                        fill="#fff"
                        size={52}
                        strokeWidth={0}
                      />
                    ) : (
                      <Play fill="#fff"
                        size={52}
                        strokeWidth={0} />
                    )
                  )
                }
              </Pressable>
              <Pressable
                android_ripple={{
                  foreground: true,
                  borderless: true,
                  color: colors.border,
                  radius: 35
                }}
                hitSlop={10}
                className='active:scale-95'
                onPress={onNext} style={styles.transportBtn}>
                <SkipForward
                  fill="#fff"
                  strokeWidth={3}
                  size={36} color="#fff" />
              </Pressable>
            </View>

            {/* Utility Tab Bar */}
            <View style={styles.utilityBar}>
              <Pressable
                onPress={() => setActiveView(activeView === 'lyrics' ? 'artwork' : 'lyrics')}
                style={{ ...styles.utilityBtn, backgroundColor: activeView === 'lyrics' ? 'rgba(255,255,255,0.2)' : 'transparent' }}
              >
                <IconSymbol
                  name="quote.bubble"
                  size={22}
                  color={activeView === 'lyrics' ? 'rgba(255,255,255)' : 'rgba(255,255,255,0.6)'}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowDeviceModal(true);
                  deviceSheetRef.current?.present();
                }}
                style={styles.utilityBtn}
              >
                <IconSymbol
                  name="airplayaudio"
                  size={22}
                  color="rgba(255,255,255,0.6)"
                />
              </Pressable>
              <Pressable
                onPress={() => setActiveView(activeView === 'queue' ? 'artwork' : 'queue')}
                style={{ ...styles.utilityBtn, backgroundColor: activeView === 'queue' ? 'rgba(255,255,255,0.2)' : 'transparent' }}
              >
                <List
                  size={21}
                  color={activeView === 'queue' ? 'rgba(255,255,255)' : 'rgba(255,255,255,0.6)'} />
              </Pressable>
            </View>
          </View>
        </GestureDetector>
      </SafeAreaView>

      {/* Device Selection Dialog BottomSheet */}
      <BottomSheetModal
        ref={deviceSheetRef}
        snapPoints={['60%']}
        enablePanDownToClose={true}
        onDismiss={() => setShowDeviceModal(false)}
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 30 }}>
          <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>Audio Status</Text>

          {/* Connected Output Card */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.mutedForeground,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: colors.border
          }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: addAlpha(colors.primary, 0.1),
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}>
              <Feather
                name={
                  activeDevice.toLowerCase().includes('bluetooth')
                    ? 'bluetooth'
                    : activeDevice.toLowerCase().includes('speaker')
                      ? 'volume-2'
                      : 'speaker'
                }
                size={22}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Output
              </Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                {activeDevice}
              </Text>
            </View>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(52, 199, 89, 0.1)',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12
            }}>
              <View style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: '#32D74B',
                marginRight: 6
              }} />
              <Text style={{ color: '#32D74B', fontSize: 11, fontWeight: '600' }}>Active</Text>
            </View>
          </View>

          {/* Available Devices List */}
          {realDevices && realDevices.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Available Devices
              </Text>
            </View>
          )}

          {/* Audio Quality Card */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.06)'
          }}>
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: addAlpha(colors.primary, 0.1),
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}>
              <MaterialCommunityIcons name="waveform" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Stream Quality
              </Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                {(() => {
                  const formats = playerMode === 'video' ? track.allVideo : track.allAudio;
                  const activeFormat = formats?.find((format: any) =>
                    playerMode === 'video'
                      ? track.activeVideoItag === format.itag
                      : track.activeItag === format.itag
                  );
                  if (activeFormat) {
                    if (playerMode === 'video') {
                      return `${activeFormat.quality || 'Standard'} (${(activeFormat.bitrate / 1000).toFixed(0)} kbps)`;
                    } else {
                      const kbps = (activeFormat.bitrate / 1000).toFixed(0);
                      const codec = activeFormat.mimeType.split('codecs="')[1]?.split('"')[0]?.toUpperCase() || 'AAC';
                      return `${codec} • ${kbps} kbps`;
                    }
                  }
                  return playerMode === 'video' ? 'Standard Video Quality' : 'Standard Quality (128 kbps)';
                })()}
              </Text>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* More Options Menu BottomSheet */}
      <SwipeBottomSheet
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
      >
        <View style={styles.moreHeader}>
          <Image source={track.artwork && (track.artwork as string).trim() !== '' ? { uri: track.artwork as string } : require('@/assets/images/icon.png')} style={styles.moreArt} />
          <View style={styles.moreHeaderInfo}>
            <Text style={[styles.moreTitle, { color: colors.text }]} numberOfLines={1}>
              {track.title}
            </Text>
            <Text style={{ color: colors.mutedForeground }} numberOfLines={1}>
              {track.artist}
              {track.description && ` • ${track.description}`}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            toggleFavorite(track);
            setShowMoreMenu(false);
          }}
          android_ripple={{
            color: colors.border
          }}
          style={styles.moreActionRow}
        >
          <IconSymbol
            name="heart"
            size={18}
            color={isFav ? '#FF3B30' : colors.text}
          />
          <Text style={[styles.moreActionText, { color: colors.text }]}>
            {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setShowMoreMenu(false);
            setTimeout(() => setShowPlaylistSelectModal(true), 250);
          }}
          android_ripple={{
            color: colors.border
          }}
          style={styles.moreActionRow}
        >
          <Feather name="plus-circle" size={18} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Add to Playlist</Text>
        </Pressable>
        {!isLive && (
          <Pressable
            onPress={handleDownloadClick}
            style={styles.moreActionRow}
            android_ripple={{
              color: colors.border
            }}
            disabled={downloadingIds[track.id] !== undefined}
          >
            {downloadingIds[track.id] !== undefined ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather
                name={isDownloaded(track.id) ? 'check-circle' : 'download'}
                size={18}
                color={isDownloaded(track.id) ? '#34C759' : colors.text}
              />
            )}
            <Text style={[styles.moreActionText, { color: isDownloaded(track.id) ? '#34C759' : colors.text }]}>
              {downloadingIds[track.id] !== undefined
                ? `Downloading (${Math.round(downloadingIds[track.id] * 100)}%)`
                : isDownloaded(track.id)
                  ? 'Downloaded'
                  : 'Download Song'}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleShare}
          style={styles.moreActionRow}
          android_ripple={{
            color: colors.border
          }}
        >
          <Feather name="share-2" size={18} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Share Song</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setShowMoreMenu(false);
            setTimeout(() => setShowAboutModal(true), 250);
          }}
          style={styles.moreActionRow}
          android_ripple={{
            color: colors.border
          }}
        >
          <Feather name="info" size={18} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Song Info</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            setShowMoreMenu(false);
            setTimeout(() => setShowQualityModal(true), 250);
          }}
          style={styles.moreActionRow}
          android_ripple={{
            color: colors.border
          }}
        >
          <MaterialCommunityIcons name="waveform" size={18} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Audio Quality</Text>
        </Pressable>
      </SwipeBottomSheet>

      {/* Select Playlist BottomSheet */}
      <SwipeBottomSheet
        visible={showPlaylistSelectModal}
        onClose={() => setShowPlaylistSelectModal(false)}
        backgroundColor={colors.card}
      >
        <Text style={[styles.modalTitle, { color: colors.text }]}>Add to Playlist</Text>
        <BottomSheetScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          <Pressable
            android_ripple={{
              color: colors.border
            }}
            onPress={() => {
              setShowPlaylistSelectModal(false);
              setTimeout(() => setShowCreatePlaylistModal(true), 250);
            }}
            style={[styles.deviceRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' }]}
          >
            <Feather name="plus-circle" size={20} color={colors.mutedForeground} style={{ marginRight: 15 }} />
            <Text style={[styles.deviceText, { color: colors.mutedForeground, fontWeight: '700' }]}>Create New Playlist...</Text>
          </Pressable>

          {playlists.length === 0 ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <Text style={{ color: colors.mutedForeground }}>No playlists available</Text>
            </View>
          ) : (
            playlists.map((pl) => (
              <Pressable
                android_ripple={{
                  color: colors.border
                }}
                key={pl.id}
                onPress={() => handleAddToPlaylist(pl.id, pl.name)}
                style={styles.deviceRow}
              >
                <Feather name="folder" size={20} color={colors.text} style={{ marginRight: 15 }} />
                <Text style={[styles.deviceText, { color: colors.text }]}>{pl.name}</Text>
              </Pressable>
            ))
          )}
        </BottomSheetScrollView>
      </SwipeBottomSheet>

      {/* Create Playlist from Player BottomSheet */}
      <CreatePlaylistBottomSheet
        visible={showCreatePlaylistModal}
        onClose={() => setShowCreatePlaylistModal(false)}
        buttonText="Create & Add"
        onCreateSuccess={async (newPlaylist) => {
          await addTrackToPlaylist(newPlaylist.id, track);
          alert(`Playlist created and "${track.title}" added!`);
        }}
      />

      {/* Song Info BottomSheet */}
      <SwipeBottomSheet
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        backgroundColor={colors.card}
      >
        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 15 }]}>Song Info</Text>

        <BottomSheetScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          {isLive && track.artwork && (
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Image
                source={{ uri: track.artwork }}
                style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' }}
                resizeMode="contain"
              />
            </View>
          )}

          <View style={{ backgroundColor: addAlpha(colors.text, 0.04), borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Title</Text>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '70%' }} numberOfLines={1}>{track.title}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Artist</Text>
              <TouchableOpacity
                onPress={() => { setShowAboutModal(false); handleArtistPress(); }}
                disabled={isLive}
              >
                <Text style={[
                  { color: colors.primary, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
                  isLive && { color: colors.text, textDecorationLine: 'none' }
                ]}>
                  {track.artist}
                </Text>
              </TouchableOpacity>
            </View>
            {track.album && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Album</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '70%' }} numberOfLines={1}>{track.album}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Provider</Text>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                {track.album === 'Radio Garden' || track.id?.startsWith('radiogarden-') ? 'Radio Garden' : 'YouTube Music'}
              </Text>
            </View>
            {track.website && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Website</Text>
                <TouchableOpacity onPress={() => Linking.openURL(track.website!)}>
                  <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline', maxWidth: 200 }} numberOfLines={1}>
                    {track.website}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {track.streamHost && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Stream Host</Text>
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '75%' }} numberOfLines={1}>
                  {track.streamHost}
                </Text>
              </View>
            )}
          </View>
        </BottomSheetScrollView>
      </SwipeBottomSheet>

      {/* Quality Selection BottomSheet */}
      <SwipeBottomSheet
        visible={showQualityModal}
        onClose={() => setShowQualityModal(false)}
        backgroundColor={colors.card}
      >
        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 15 }]}>
          {playerMode === 'video' ? 'Video Quality' : 'Audio Quality'}
        </Text>

        <BottomSheetScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
          {isLive ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <MaterialCommunityIcons name="waveform" size={32} color={colors.primary} style={{ marginBottom: 8 }} />
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Live Stream Active</Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                Broadcasting Live • 128 kbps (MP3)
              </Text>
            </View>
          ) : (() => {
            const formats = playerMode === 'video' ? track.allVideo : track.allAudio;
            if (formats && formats.length > 0) {
              return formats.map((format: any, idx: number) => {
                const isSelected = playerMode === 'video'
                  ? track.activeVideoItag === format.itag
                  : track.activeItag === format.itag;

                const label = playerMode === 'video'
                  ? `${format.quality || 'Standard'} (${(format.bitrate / 1000).toFixed(0)} kbps)`
                  : (() => {
                    const kbps = (format.bitrate / 1000).toFixed(0);
                    const codec = format.mimeType.split('codecs="')[1]?.split('"')[0]?.toUpperCase() || 'AAC';
                    return `${codec} • ${kbps} kbps`;
                  })();

                return (
                  <Pressable
                    key={format.itag || idx}
                    android_ripple={{ color: colors.border }}
                    onPress={() => {
                      setShowQualityModal(false);
                      const formatUrl = format.url + `&__ua=${encodeURIComponent(track.userAgent || 'Mozilla/5.0')}`;
                      if (playerMode === 'video') {
                        changeVideoQuality(formatUrl, format.itag);
                      } else {
                        changeAudioQuality(formatUrl, format.itag);
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: isSelected ? addAlpha(colors.primary, 0.08) : 'transparent',
                      borderRadius: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: isSelected ? colors.primary : colors.text, fontSize: 14, fontWeight: isSelected ? '700' : '400' }}>
                      {label}
                    </Text>
                    {isSelected && (
                      <Feather name="check" size={16} color={colors.primary} />
                    )}
                  </Pressable>
                );
              });
            } else {
              return (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                    {playerMode === 'video' ? 'Standard Video Quality' : 'Standard Quality (128 kbps)'}
                  </Text>
                </View>
              );
            }
          })()}
        </BottomSheetScrollView>
      </SwipeBottomSheet>

      {/* Artist Selection BottomSheet */}
      <SwipeBottomSheet
        visible={showArtistSheet}
        onClose={() => setShowArtistSheet(false)}
      >
        <Text variant="large" style={{ fontWeight: '800', textAlign: 'center', marginBottom: 16, marginTop: 10 }}>
          Select Artist
        </Text>
        <BottomSheetScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          {artistOptions.map((art) => (
            <Pressable
              key={art.id}
              onPress={() => {
                setShowArtistSheet(false);
                router.push(`/artist/${art.id}` as any);
              }}
              style={{
                paddingVertical: 14,
                borderBottomWidth: 0.5,
                borderBottomColor: colors.border,
              }}
            >
              <Text style={{ fontSize: 16 }}>{art.name}</Text>
            </Pressable>
          ))}
        </BottomSheetScrollView>
      </SwipeBottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: 28,
  },
  artworkSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  artworkWrap: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: width - 56,
    maxHeight: height * 0.42,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 28,
    elevation: 20,
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#333',
  },
  bufferOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomSheet: {
    paddingBottom: 20,
    gap: 0,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metadataInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  artistText: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
  },
  metadataActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  seekSection: {
    marginBottom: 18,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontVariant: ['tabular-nums'],
  },
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 34,
  },
  transportBtn: {
    padding: 8,
  },

  mainPlayBtn: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  utilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
  },
  utilityBtn: {
    padding: 8,
    borderRadius: 10
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  deviceModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  moreModalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  deviceText: {
    fontSize: 15,
    marginLeft: 12,
  },
  closeModalBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  moreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
  },
  moreArt: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
  },
  moreHeaderInfo: {
    flex: 1,
  },
  moreTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  moreActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  moreActionText: {
    fontSize: 15,
    marginLeft: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  collapseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  modeToggleCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 3,
    width: 140,
    height: 32,
  },
  modeToggleBtn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modeToggleBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoBufferOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoTopBar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  qualityPillsScroll: {
    flex: 1,
  },
  qualityPillsContent: {
    gap: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  qualityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  qualityPillActive: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: '#fff',
  },
  qualityPillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
  },
  qualityPillTextActive: {
    color: '#000',
    fontSize: 11,
    fontWeight: '700',
  },
  fullscreenBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
    width: 30,
    overflow: "hidden",
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

export default TrackContent;
