import SeekSlider from '@/components/SliderSeek';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography as Text } from '@/components/ui/typography';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { toast, useDownloads, useFavorites, usePlaylists, useQueue } from '@/services';
import { setVideoQualityChanging } from '@/services/PlaybackService';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated,
  Alert,
  Dimensions,
  Easing,
  Image,
  Linking,
  NativeModules, Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import { FlatList, Gesture, GestureDetector } from 'react-native-gesture-handler';
import ImageColors from 'react-native-image-colors';
import Reanimated, { Easing as ReEasing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming, SharedValue, useFrameCallback } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';
import { Input } from '../ui/input';
import MarqueeText from './MarqueeText';
import { SwipeBottomSheet } from './SwipeBottomSheet';
import { type AppTrack } from './Tracks';

const { width, height } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// Palette extraction hook
// ─────────────────────────────────────────────────────────────
type Palette = [string, string, string, string];
const FALLBACK: Palette = ['#0d0d2b', '#0b1f3a', '#1a0b2e', '#0e2a1a'];

function useArtworkPalette(uri?: string): Palette {
  const [palette, setPalette] = useState<Palette>(FALLBACK);

  useEffect(() => {
    if (!uri) return;
    ImageColors.getColors(uri, {
      fallback: FALLBACK[0],
      cache: true,
      key: uri,
    })
      .then((colors) => {
        if (colors.platform === 'android' || colors.platform === 'web') {
          setPalette([
            colors.vibrant ?? colors.lightVibrant ?? FALLBACK[0],
            colors.lightVibrant ?? colors.vibrant ?? FALLBACK[1],
            colors.muted ?? colors.darkMuted ?? FALLBACK[2],
            colors.lightMuted ?? FALLBACK[3],
          ]);
        } else if (colors.platform === 'ios') {
          setPalette([
            colors.primary ?? FALLBACK[0],
            colors.secondary ?? FALLBACK[1],
            colors.background ?? FALLBACK[2],
            colors.detail ?? FALLBACK[3],
          ]);
        }
      })
      .catch(() => { });
  }, [uri]);

  return palette;
}

// ─────────────────────────────────────────────────────────────
// Blob definitions — wide flat ellipses, Apple Music style
// ─────────────────────────────────────────────────────────────
type BlobDef = {
  cx: number; cy: number;
  w: number; h: number;
  driftX: number; driftY: number;
  duration: number;
  slot: 0 | 1 | 2 | 3;
};

const BLOBS: BlobDef[] = [
  // Big bloom centered behind artwork
  { cx: 0.5, cy: 0.22, w: width * 1.6, h: width * 1.1, driftX: 25, driftY: 20, duration: 13000, slot: 0 },
  // Top-right accent
  { cx: 1.0, cy: 0.0, w: width * 1.3, h: width * 0.9, driftX: -40, driftY: 35, duration: 16000, slot: 1 },
  // Bottom-left pool
  { cx: 0.0, cy: 0.9, w: width * 1.5, h: width * 1.0, driftX: 45, driftY: -30, duration: 14500, slot: 2 },
  // Bottom-right pool
  { cx: 1.1, cy: 1.0, w: width * 1.4, h: width * 0.95, driftX: -50, driftY: -40, duration: 15000, slot: 3 },
];

// Renders one soft blob as 5 concentric feathered rings
const Blob = React.memo(({ def, color, masterOpacity }: {
  def: BlobDef;
  color: string;
  masterOpacity: Animated.AnimatedInterpolation<number>;
}) => {
  const drift = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: { x: def.driftX, y: def.driftY }, duration: def.duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: { x: -def.driftX * 0.6, y: -def.driftY * 0.5 }, duration: def.duration * 1.2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: { x: 0, y: 0 }, duration: def.duration * 0.8, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.12, duration: def.duration * 1.3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.90, duration: def.duration * 1.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    return () => { drift.stopAnimation(); breathe.stopAnimation(); };
  }, []);

  // 5 rings: each larger + more transparent = gaussian soft edge
  const RINGS = [
    { s: 1.00, a: 0.60 },
    { s: 1.30, a: 0.28 },
    { s: 1.65, a: 0.12 },
    { s: 2.05, a: 0.05 },
    { s: 2.50, a: 0.02 },
  ];

  return (
    <Animated.View style={{
      position: 'absolute',
      left: def.cx * width - def.w / 2,
      top: def.cy * height - def.h / 2,
      width: def.w,
      height: def.h,
      alignItems: 'center',
      justifyContent: 'center',
      transform: [{ translateX: drift.x }, { translateY: drift.y }, { scale: breathe }],
    }}>
      {RINGS.map((ring, i) => (
        <Animated.View key={i} style={{
          position: 'absolute',
          width: def.w,
          height: def.h,
          borderRadius: def.w * 10,
          backgroundColor: color,
          opacity: masterOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [0, ring.a],
          }),
        }} />
      ))}
    </Animated.View>
  );
});

const FlowingBackground = React.memo(({ palette }: { palette: Palette }) => {
  const [layers, setLayers] = useState<[Palette, Palette]>([palette, palette]);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setLayers(([, prev]) => [prev, palette]);
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 2000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [palette.join(',')]);

  const [palA, palB] = layers;

  const opA = useMemo(() =>
    fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), []);
  const opB = useMemo(() =>
    fade.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Pure black canvas */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />

      {/* Outgoing palette */}
      {BLOBS.map((b, i) => (
        <Blob key={`a${i}`} def={b} color={palA[b.slot]} masterOpacity={opA} />
      ))}

      {/* Incoming palette */}
      {BLOBS.map((b, i) => (
        <Blob key={`b${i}`} def={b} color={palB[b.slot]} masterOpacity={opB} />
      ))}

      {/* Heavy gaussian blur — this is what melts rings into smooth glow */}
      <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />

      {/* Top dark vignette — status bar legibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.0)']}
        locations={[0, 0.25]}
        style={StyleSheet.absoluteFill}
      />

      {/* Bottom dark vignette — controls legibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.7)']}
        locations={[0.5, 1.0]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
});

// ─────────────────────────────────────────────────────────────
// Synced LRC parser & Clean text
// ─────────────────────────────────────────────────────────────
type LrcLine = {
  time: number;
  text: string;
};

function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s*\(.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\)/gi, '')
    .replace(/\s*\[.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\]/gi, '')
    .replace(/\s*【.*?】/g, '')
    .replace(/\s*\|.*$/g, '')
    .replace(/\s*-\s*(official|video|audio|lyrics|lyric|visualizer).*$/gi, '')
    .trim();
}

function parseLrc(lrcText: string): LrcLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result: LrcLine[] = [];
  const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseFloat(match[2]);
      const text = line.replace(timeRegex, '').trim();
      result.push({ time: min * 60 + sec, text });
    } else {
      const cleanLine = line.trim();
      if (cleanLine && !cleanLine.startsWith('[')) {
        result.push({ time: -1, text: cleanLine });
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

const DEVICES = [
  { name: 'Phone Speakers', icon: 'speaker' },
  { name: 'Bluetooth Headphones', icon: 'bluetooth' },
  { name: 'Living Room TV (Cast)', icon: 'tv' },
];

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

function useSmoothPosition(position: number, isPlaying: boolean) {
  const targetPosition = useSharedValue(position);
  const smoothPosition = useSharedValue(position);

  useEffect(() => {
    targetPosition.value = position;
    // Seeks / track changes snap immediately instead of easing across.
    if (Math.abs(smoothPosition.value - position) > 0.3) {
      smoothPosition.value = position;
    }
  }, [position]);

  useFrameCallback((frame) => {
    const dt = (frame.timeSincePreviousFrame ?? 16.6) / 1000;
    if (isPlaying) smoothPosition.value += dt;
    // Proportional correction — fast enough to stay in sync but smooth out micro-steps
    smoothPosition.value += (targetPosition.value - smoothPosition.value) * 0.3;
  }, true);

  return smoothPosition;
}

const AnimatedWord = React.memo(({ word, cue, transition, isActive, smoothPosition, fontSize, lineHeight, marginRight }: {
  word: string;
  cue: number;
  transition: number;
  isActive: boolean;
  smoothPosition: SharedValue<number>;
  fontSize: number;
  lineHeight: number;
  marginRight: number;
}) => {
  const animStyle = useAnimatedStyle(() => {
    const t = smoothPosition.value;
    let p = 0;
    if (t >= cue + transition) p = 1;
    else if (t > cue) p = (t - cue) / transition;
    return { opacity: p };
  }, [cue, transition]);

  return (
    <View style={{ position: 'relative', marginRight }}>
      <Text style={{ fontSize, lineHeight: lineHeight * 1.1, fontWeight: '700', color: 'rgba(255,255,255,0.22)', letterSpacing: 0.2 }}>
        {word}
      </Text>
      <Reanimated.View style={[{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }, animStyle]}>
        <Text style={{ fontSize, lineHeight: lineHeight * 1.1, fontWeight: '700', color: '#fff', letterSpacing: 0.2 }}>
          {word}
        </Text>
      </Reanimated.View>
    </View>
  );
});

const LyricLine = React.memo(({
  text, isActive, isPast, startTime, endTime, smoothPosition, fontSize, spacingVal,
}: {
  text: string;
  isActive: boolean;
  isPast: boolean;
  startTime: number;
  endTime: number;
  smoothPosition: SharedValue<number>;
  fontSize: number;
  spacingVal: number;
}) => {
  const words = useMemo(() => text.split(' '), [text]);
  const lineHeight = fontSize * spacingVal;
  const marginRight = fontSize * 0.28;

  const lineOpacity = useSharedValue(isActive ? 1 : 0.28);
  const lineScale = useSharedValue(isActive ? 1 : 0.98);

  useEffect(() => {
    lineOpacity.value = withTiming(isActive ? 1 : isPast ? 0.22 : 0.35, { duration: 350, easing: ReEasing.out(ReEasing.cubic) });
    lineScale.value = withSpring(isActive ? 1 : 0.98, { damping: 18, stiffness: 140 });
  }, [isActive, isPast]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
    transform: [{ scale: lineScale.value }],
  }));

  // Apple-style: each word gets a short, fixed "pop" window (not spread
  // across the line's whole duration) — that's what gives the snappy sweep
  // instead of a slow linear fade per word.
  const totalDuration = Math.max(endTime - startTime, 0.5);
  const wordDuration = totalDuration / words.length;
  const cueTimes = useMemo(
    () => words.map((_, i) => startTime + i * wordDuration),
    [words, startTime, wordDuration]
  );
  const transition = Math.min(0.22, wordDuration * 0.85);

  return (
    <Reanimated.View style={[{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }, lineStyle]}>
      {words.map((word, i) => (
        <AnimatedWord
          key={i}
          word={word}
          cue={cueTimes[i]}
          transition={transition}
          isActive={isActive}
          smoothPosition={smoothPosition}
          fontSize={fontSize}
          lineHeight={lineHeight}
          marginRight={marginRight}
        />
      ))}
    </Reanimated.View>
  );
});

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
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [activeDevice, setActiveDevice] = useState('Phone Speakers');
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
        toast.success(`"${track.title}" downloaded offline!`);
      } else {
        toast.error(`Failed to download "${track.title}"`);
      }
    }
  };

  const handleArtistPress = () => {
    onCollapse();
    if (track.artists && track.artists.length > 1) {
      Alert.alert(
        'Select Artist',
        'Which artist would you like to view?',
        [
          ...track.artists.map((art) => ({
            text: art.name,
            onPress: () => router.push(`/artist/${art.id}` as any),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ],
        { cancelable: true }
      );
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

  // Load real audio devices on Android when the modal is shown
  useEffect(() => {
    if (showDeviceModal && Platform.OS === 'android' && NativeModules.AudioRoutingModule) {
      NativeModules.AudioRoutingModule.getAudioDevices()
        .then((devices: any[]) => {
          // Deduplicate devices by name to keep the UI list clean
          const seen = new Set<string>();
          const unique = devices.filter((d) => {
            if (seen.has(d.name)) return false;
            seen.add(d.name);
            return true;
          });
          setRealDevices(unique);
        })
        .catch((e: any) => console.warn('[AudioRoutingModule] Failed to load devices:', e));
    }
  }, [showDeviceModal]);

  // Initialize expo-video player
  const videoPlayer = useVideoPlayer(track.videoUrl ?? '', (player) => {
    player.loop = false;
    player.muted = false;
  });

  // Playlists States
  const { playlists, createPlaylist, addTrackToPlaylist } = usePlaylists();
  const [showPlaylistSelectModal, setShowPlaylistSelectModal] = useState(false);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleAddToPlaylist = async (playlistId: string, playlistName: string) => {
    setShowPlaylistSelectModal(false);
    const success = await addTrackToPlaylist(playlistId, track);
    if (success) {
      alert(`Added to "${playlistName}"`);
    } else {
      alert(`"${track.title}" is already in "${playlistName}"`);
    }
  };

  const handleCreatePlaylistFromPlayer = async () => {
    if (!newPlaylistName.trim()) return;
    const res = await createPlaylist(newPlaylistName.trim());
    setNewPlaylistName('');
    setShowCreatePlaylistModal(false);
    await addTrackToPlaylist(res.id, track);
    alert(`Playlist created and "${track.title}" added!`);
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

  // Lyrics states
  const [lyricsLines, setLyricsLines] = useState<LrcLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const smoothPosition = useSmoothPosition(position, isPlaying);
  const scrollRef = useRef<ScrollView>(null);
  const lineLayouts = useRef<{ y: number; height: number }[]>([]);
  const lyricsContainerHeight = useRef(0);

  const queryLrcLib = useCallback((title: string, artist: string, duration: number) => {
    const cleanedTitle = cleanText(title);
    const cleanedArtist = cleanText(artist).split(/ & | and |, | x | X | feat\. | feat | ft\. | ft | featuring | with /i)[0].trim();

    console.log(`[Trackcontent] Querying LrcLib for: ${cleanedTitle} - ${cleanedArtist}`);
    const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}&duration=${Math.round(duration)}`;

    fetch(url)
      .then((res) => {
        if (res.status === 404) {
          console.log(`[Trackcontent] LrcLib /get returned 404. Trying /search...`);
          const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanedTitle + ' ' + cleanedArtist)}`;
          return fetch(searchUrl).then(r => r.json()).then(results => {
            if (Array.isArray(results) && results.length > 0) {
              const bestMatch = results[0];
              return {
                syncedLyrics: bestMatch.syncedLyrics,
                plainLyrics: bestMatch.plainLyrics
              };
            }
            throw new Error('No search results');
          });
        }
        return res.json();
      })
      .then((data) => {
        const lrc = data.syncedLyrics || data.plainLyrics || '';
        if (lrc) {
          console.log(`[Trackcontent] LrcLib lyrics loaded successfully!`);
          setLyricsLines(parseLrc(lrc));
        } else {
          setLyricsLines([{ time: -1, text: 'Lyrics not available' }]);
        }
      })
      .catch((err) => {
        console.warn('[Trackcontent] LrcLib fetch failed:', err);
        setLyricsLines([{ time: -1, text: 'Lyrics not found' }]);
      })
      .finally(() => {
        setLyricsLoading(false);
      });
  }, []);

  // Fetch lyrics on song change
  const fetchLyrics = useCallback((force = false) => {
    if (!track?.id) return;
    const videoId = track.id.startsWith('yt-') ? track.id.substring(3) : track.id;
    setLyricsLoading(true);
    setLyricsLines([]);

    console.log(`[Trackcontent] Fetching SimpMusic lyrics for: ${videoId}`);
    fetch(`https://api-lyrics.simpmusic.org/v1/${videoId}`)
      .then((res) => res.json())
      .then((resJson) => {
        console.log(`[Trackcontent] SimpMusic response success status:`, resJson.success);
        if (resJson.success && resJson.data && resJson.data.length > 0) {
          const match = resJson.data[0];
          const lrc = match.richSyncLyrics || match.syncedLyrics || match.plainLyrics || '';
          if (lrc) {
            console.log(`[Trackcontent] SimpMusic lyrics loaded successfully!`);
            setLyricsLines(parseLrc(lrc));
            setLyricsLoading(false);
          } else {
            queryLrcLib(track.title, track.artist, track.duration || 0);
          }
        } else {
          queryLrcLib(track.title, track.artist, track.duration || 0);
        }
      })
      .catch((err) => {
        console.log(`[Trackcontent] SimpMusic failed, falling back to LrcLib:`, err.message);
        queryLrcLib(track.title, track.artist, track.duration || 0);
      });
  }, [track?.id, track?.title, track?.artist, track?.duration, queryLrcLib]);

  useEffect(() => {
    fetchLyrics();
  }, [track?.id, fetchLyrics]);

  const handleShareLyrics = async () => {
    try {
      const activeLine = lyricsLines[activeIndex];
      let shareMessage = '';
      if (activeLine && activeLine.text && activeLine.time !== -1) {
        shareMessage = `🎵 "${activeLine.text}"\n\nShared from "${track.title}" by ${track.artist} on Bunny`;
      } else {
        const fullLyrics = lyricsLines
          .filter(l => l.text && l.time !== -1)
          .map(l => l.text)
          .join('\n');
        shareMessage = `🎶 Lyrics for "${track.title}" by ${track.artist}:\n\n${fullLyrics || 'Lyrics not available'}`;
      }
      await Share.share({
        message: shareMessage,
      });
    } catch (e) {
      console.warn('Failed to share lyrics:', e);
    }
  };

  // Determine active lyrics line index
  const activeIndex = useMemo(() => {
    if (!lyricsLines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      if (lyricsLines[i].time !== -1 && lyricsLines[i].time <= position) {
        idx = i;
      }
    }
    return idx;
  }, [lyricsLines, position]);

  // Auto scroll to active lyric line — smoothly centres the active line using real layouts
  useEffect(() => {
    if (activeView !== 'lyrics' || activeIndex < 0) return;
    const layout = lineLayouts.current[activeIndex];
    if (!layout || !lyricsContainerHeight.current) return;
    const targetY = layout.y + layout.height / 2 - lyricsContainerHeight.current * 0.45;
    scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
  }, [activeIndex, activeView]);

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
        <LinearGradient
          colors={[palette[0] || '#121212', palette[2] || '#000000']}
          style={StyleSheet.absoluteFill}
        />
      )}

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Top Header / Drag Zone */}
        <GestureDetector gesture={headerGesture}>
          <View style={styles.topHeader}>
            <Pressable
              android_ripple={{
                color: "#ffffff40",
              }}
              onPress={onCollapse} style={styles.collapseBtn}>
              <IconSymbol name="chevron.down" size={22} color="rgba(255,255,255,0.7)" />
            </Pressable>

            {/* Song / Video Switch capsule */}
            <View style={styles.modeToggleCapsule}>
              <Pressable
                android_ripple={{
                  color: "#ffffff40",
                }}
                onPress={() => setPlayerMode('audio')}
                style={[styles.modeToggleBtn, playerMode === 'audio' && styles.modeToggleBtnActive]}
              >
                <Text style={[styles.modeToggleText, playerMode === 'audio' && styles.modeToggleTextActive]}>Song</Text>
              </Pressable>
              <Pressable
                disabled={!track.videoUrl}
                android_ripple={{
                  color: "#ffffff40",
                }}
                onPress={() => {
                  if (track.videoUrl) {
                    setPlayerMode('video');
                  }
                }}
                style={[
                  styles.modeToggleBtn,
                  playerMode === 'video' && styles.modeToggleBtnActive,
                  !track.videoUrl && { opacity: 0.35 }
                ]}
              >
                <Text style={[styles.modeToggleText, playerMode === 'video' && styles.modeToggleTextActive]}>Video</Text>
              </Pressable>
            </View>

            <View style={{ width: 36 }} />
          </View>
        </GestureDetector>

        {/* Main Section */}
        <View style={styles.artworkSection}>
          {activeView === 'lyrics' ? (
            <View style={[styles.lyricsContainer, { overflow: 'hidden' }]}>
              {/* Floating Lyrics Action Bar (Resync & Share) at the bottom */}
              {!lyricsLoading && lyricsLines.length > 0 && lyricsLines[0].time !== -1 && (
                <View style={{
                  position: 'absolute',
                  bottom: 25,
                  right: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  zIndex: 20,
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  borderRadius: 24,
                  padding: 6,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 5
                }}>
                  <TouchableOpacity
                    onPress={() => fetchLyrics(true)}
                    activeOpacity={0.7}
                    style={{
                      padding: 8,
                      marginRight: 2
                    }}
                  >
                    <Feather name="refresh-cw" size={15} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleShareLyrics}
                    activeOpacity={0.7}
                    style={{
                      padding: 8
                    }}
                  >
                    <Feather name="share-2" size={15} color="rgba(255,255,255,0.9)" />
                  </TouchableOpacity>
                </View>
              )}

              {lyricsLoading ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : lyricsLines.length === 0 || (lyricsLines.length === 1 && lyricsLines[0].text === 'Lyrics not found') ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 16 }}>
                    Lyrics not found
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 }}>
                    Lyrics provided by LrcLib & SimpMusic
                  </Text>
                  <TouchableOpacity
                    onPress={() => fetchLyrics(true)}
                    activeOpacity={0.7}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.08)'
                    }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                      Refetch Lyrics
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView
                  ref={scrollRef}
                  onLayout={(e) => { lyricsContainerHeight.current = e.nativeEvent.layout.height; }}
                  contentContainerStyle={styles.lyricsContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={{ height: 180 }} />
                  {lyricsLines.map((item, index) => {
                    const isActive = index === activeIndex;
                    const fontSize = lyricsSize === 'small' ? 18 : lyricsSize === 'large' ? 28 : 22;
                    const spacingVal = lyricsSpacing === 'compact' ? 1.25 : lyricsSpacing === 'spacious' ? 1.85 : 1.5;
                    const nextLine = lyricsLines[index + 1];
                    const endTime = nextLine && nextLine.time !== -1 ? nextLine.time : item.time + 6;

                    return (
                      <Pressable
                        key={index}
                        onLayout={(e) => {
                          lineLayouts.current[index] = {
                            y: e.nativeEvent.layout.y,
                            height: e.nativeEvent.layout.height,
                          };
                        }}
                        onPress={() => { if (item.time >= 0) onSeek(item.time); }}
                        android_ripple={{ foreground: true, color: '#ffffff40' }}
                        style={styles.lyricsLineWrap}
                      >
                        <LyricLine
                          text={item.text}
                          isActive={isActive}
                          isPast={index < activeIndex}
                          startTime={item.time}
                          endTime={endTime}
                          smoothPosition={smoothPosition}
                          fontSize={fontSize}
                          spacingVal={spacingVal}
                        />
                      </Pressable>
                    );
                  })}

                  <View style={{
                    alignItems: 'center',
                    paddingTop: 24,
                    paddingBottom: 220,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: 'rgba(255,255,255,0.08)',
                    marginTop: 20
                  }}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Lyrics provided by LrcLib & SimpMusic
                    </Text>
                    <TouchableOpacity
                      onPress={() => fetchLyrics(true)}
                      activeOpacity={0.7}
                      style={{
                        marginTop: 10,
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(255,255,255,0.08)'
                      }}
                    >
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                        Refetch Lyrics
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          ) : activeView === 'queue' ? (
            <View style={styles.queueContainer}>
              <Text style={styles.queueTitle}>Up Next ({queue.length})</Text>

              <FlatList
                data={queue}
                keyExtractor={(item, idx) => item.id + '-' + idx}
                style={{ flex: 1, width: '100%' }}
                renderItem={({ item, index }) => {
                  const isCurrent = item.id === track.id;
                  return (
                    <Pressable
                      onPress={() => onSkipToTrack(item.id as string)}
                      android_ripple={{
                        foreground: true,
                        color: '#ffffff40',
                      }}
                      style={[
                        styles.queueItem,
                        isCurrent && { backgroundColor: 'rgba(255,255,255,0.1)' }
                      ]}
                    >
                      <Image source={item.artwork && (item.artwork as string).trim() !== '' ? { uri: item.artwork as string } : require('@/assets/images/icon.png')} style={styles.queueArt} />
                      <View style={styles.queueInfo}>
                        <Text style={[styles.queueItemTitle, isCurrent && { fontWeight: '700' }]} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.queueItemArtist} numberOfLines={1}>
                          {item.artist}
                        </Text>
                      </View>
                      {isCurrent && <Feather name="volume-2" size={16} color={"#FFF"} />}
                    </Pressable>
                  );
                }}
                contentContainerStyle={styles.queueContent}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : (
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
          )}
        </View>

        {/* Control & Details Section */}
        <GestureDetector gesture={controlsGesture}>
          <View style={styles.bottomSheet}>
            {/* Metadata Row */}
            <View style={styles.metadataRow}>
              <View style={styles.metadataInfo}>
                <MarqueeText style={styles.titleText} speed={35} pauseMs={1200}>{track.title}</MarqueeText>
                <TouchableOpacity onPress={handleArtistPress} activeOpacity={0.75} disabled={isLive}>
                  <MarqueeText style={styles.artistText} speed={30} pauseMs={1200}>
                    {`${track.artist}${track.album ? ` • ${track.album}` : ''}`}
                  </MarqueeText>
                </TouchableOpacity>
              </View>
              <View style={styles.metadataActions}>
                <Pressable
                  android_ripple={{
                    foreground: true,
                    color: "#FF3B30",
                  }}
                  onPress={() => toggleFavorite(track)} style={styles.metaCircleBtn}>
                  <IconSymbol
                    name="heart"
                    size={18}
                    color={isFav ? '#FF3B30' : 'rgba(255,255,255,0.8)'}
                  />
                </Pressable>
                <Pressable
                  android_ripple={{
                    foreground: true,
                    color: "#ffffff40",
                  }}
                  onPress={() => setShowMoreMenu(true)} style={styles.metaCircleBtn}>
                  <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.8)" />
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
                  color: colors.border,
                  radius: 28
                }}
                className='active:scale-95'
                hitSlop={10}
                onPress={onPrev} style={styles.transportBtn}>
                <IconSymbol name="backward.fill" size={40} color="#fff" />
              </Pressable>
              <Pressable
                android_ripple={{
                  foreground: true,
                  color: colors.border,
                  radius: 36
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
                <IconSymbol
                  name={
                    playerMode === 'video'
                      ? (isVideoPlaying ? "pause.fill" : "play.fill")
                      : (isPlaying ? "pause.fill" : "play.fill")
                  }
                  size={52}
                  color="#fff"
                  active={playerMode === 'video' ? isVideoPlaying : isPlaying}
                />
              </Pressable>
              <Pressable
                android_ripple={{
                  foreground: true,
                  color: colors.border,
                  radius: 28
                }}
                hitSlop={10}
                className='active:scale-95'
                onPress={onNext} style={styles.transportBtn}>
                <IconSymbol name="forward.fill" size={40} color="#fff" />
              </Pressable>
            </View>

            {/* Utility Tab Bar */}
            <View style={styles.utilityBar}>
              <TouchableOpacity
                onPress={() => setActiveView(activeView === 'lyrics' ? 'artwork' : 'lyrics')}
                style={styles.utilityBtn}
              >
                <IconSymbol
                  name="quote.bubble"
                  size={22}
                  color={activeView === 'lyrics' ? colors.primary : 'rgba(255,255,255,0.6)'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDeviceModal(true)}
                style={styles.utilityBtn}
              >
                <IconSymbol
                  name="airplayaudio"
                  size={22}
                  color="rgba(255,255,255,0.6)"
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setActiveView(activeView === 'queue' ? 'artwork' : 'queue')}
                style={styles.utilityBtn}
              >
                <IconSymbol
                  name="list.bullet"
                  size={22}
                  color={activeView === 'queue' ? colors.primary : 'rgba(255,255,255,0.6)'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </GestureDetector>
      </SafeAreaView>

      {/* Device Selection Dialog BottomSheet */}
      <SwipeBottomSheet
        visible={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        backgroundColor={colors.card}
      >
        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>Audio Status</Text>

        {/* Connected Output Card */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
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
              Output Route
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
      </SwipeBottomSheet>

      {/* More Options Menu BottomSheet */}
      <SwipeBottomSheet
        visible={showMoreMenu}
        onClose={() => setShowMoreMenu(false)}
        backgroundColor={colors.card}
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
        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
      </SwipeBottomSheet>

      {/* Create Playlist from Player BottomSheet */}
      <SwipeBottomSheet
        visible={showCreatePlaylistModal}
        onClose={() => setShowCreatePlaylistModal(false)}
        backgroundColor={colors.card}
      >
        <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Playlist</Text>
        <View style={styles.inputContainer}>
          <Input
            value={newPlaylistName}
            onChangeText={setNewPlaylistName}
            placeholder="Playlist name"
            autoFocus
            style={{ backgroundColor: colors.background }}
          />
        </View>
        <Pressable
          android_ripple={{
            foreground: true,
            color: colors.border
          }}
          onPress={handleCreatePlaylistFromPlayer}
          style={[styles.createBtn, { backgroundColor: colors.background }]}>
          <Text style={styles.createBtnText}>Create & Add</Text>
        </Pressable>
      </SwipeBottomSheet>

      {/* Song Info BottomSheet */}
      <SwipeBottomSheet
        visible={showAboutModal}
        onClose={() => setShowAboutModal(false)}
        backgroundColor={colors.card}
      >
        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 15 }]}>Song Info</Text>

        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
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

        <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
    padding: 10,
  },

  // Synced lyrics styles
  lyricsContainer: {
    justifyContent: "center",
    width: width - 32,
    height: '100%',
    borderRadius: 12,
  },
  lyricsContent: {
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  lyricsLineWrap: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'flex-start',
  },
  lyricsText: {
    textAlign: 'left',
    color: '#fff',
  },
  lyricsTextActive: {
    opacity: 1,
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 5,
  },
  lyricsTextInactive: {
    color: 'rgba(255,255,255,0.3)',
  },

  // Queue styles
  queueContainer: {
    width: width - 32,
    height: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 15
  },
  queueTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'left',
  },
  queueContent: {
    paddingBottom: 20,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  queueArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  queueInfo: {
    flex: 1,
  },
  queueItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  queueItemArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
    justifyContent: 'space-between',
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
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  inputContainer: {
    marginVertical: 20,
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
});

export default TrackContent;
