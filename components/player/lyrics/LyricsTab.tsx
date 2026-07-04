import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import Reanimated, {
  Easing as ReEasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  SharedValue,
  useFrameCallback,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Typography as Text } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { type LrcLine, fetchLyricsFromApis, LYRICS_CACHE } from '@/services';
import { type AppTrack } from '../Tracks';
import LyricLine from './LyricLine';

const { width } = Dimensions.get('window');



function useSmoothPosition(position: number, isPlaying: boolean) {
  const lastPosition = useSharedValue(position);
  const lastUpdateTime = useSharedValue(Date.now());
  const smoothPosition = useSharedValue(position);

  useEffect(() => {
    const now = Date.now();
    const diff = Math.abs(smoothPosition.value - position);
    if (diff > 0.15) {
      smoothPosition.value = position;
    }
    lastPosition.value = position;
    lastUpdateTime.value = now;
  }, [position]);

  useEffect(() => {
    lastUpdateTime.value = Date.now();
  }, [isPlaying]);

  useFrameCallback(() => {
    const now = Date.now();
    if (isPlaying && lastUpdateTime.value > 0) {
      const elapsed = (now - lastUpdateTime.value) / 1000;
      smoothPosition.value = lastPosition.value + elapsed;
    } else {
      smoothPosition.value = lastPosition.value;
    }
  }, true);

  return smoothPosition;
}



interface LyricsTabProps {
  track: AppTrack;
  activePosition: number;
  activePlaying: boolean;
  onSeek: (time: number) => void;
  primaryColor: string;
}

export default function LyricsTab({
  track,
  activePosition,
  activePlaying,
  onSeek,
  primaryColor,
}: LyricsTabProps) {
  const { lyricsSize, lyricsSpacing } = useAppTheme();

  const colors = useMemo(() => ({
    text: '#ffffff',
    mutedForeground: 'rgba(255,255,255,0.65)',
    primary: primaryColor,
  }), [primaryColor]);

  const [lyricsLines, setLyricsLines] = useState<LrcLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const scrollRef = useRef<ScrollView>(null);
  const lineLayouts = useRef<{ y: number; height: number }[]>([]);
  const lyricsContainerHeight = useRef(0);

  const LYRICS_LATENCY_OFFSET = 0; // Set to 0 so lines activate at exact timestamps
  const lyricsActivePosition = Math.max(0, activePosition - LYRICS_LATENCY_OFFSET);
  const smoothPosition = useSmoothPosition(lyricsActivePosition, activePlaying);

  useAnimatedReaction(
    () => {
      const pos = smoothPosition.value;
      if (!lyricsLines.length) return -1;
      let idx = -1;
      for (let i = 0; i < lyricsLines.length; i++) {
        if (lyricsLines[i].time !== -1 && lyricsLines[i].time <= pos) {
          idx = i;
        }
      }
      return idx;
    },
    (currentIdx, previousIdx) => {
      if (currentIdx !== previousIdx && currentIdx !== null && currentIdx !== undefined) {
        runOnJS(setActiveIndex)(currentIdx);
      }
    },
    [lyricsLines]
  );

  const fetchLyrics = useCallback((force = false) => {
    if (!track?.id) return;

    // Check global in-memory cache first
    if (!force && LYRICS_CACHE.has(track.id)) {
      const cached = LYRICS_CACHE.get(track.id);
      if (cached) {
        setLyricsLines(cached);
        setLyricsLoading(false);
        return;
      }
    }

    setLyricsLoading(true);
    setLyricsLines([]);
    setActiveIndex(-1);
    lineLayouts.current = [];

    fetchLyricsFromApis(track.title, track.artist, track.duration || 0, track.id, force)
      .then((lines) => {
        LYRICS_CACHE.set(track.id, lines);
        setLyricsLines(lines);
        setLyricsLoading(false);
      })
      .catch((err) => {
        console.warn('[LyricsTab] Failed to fetch lyrics:', err);
        const fallback = [{ time: -1, text: 'Lyrics not found' }];
        LYRICS_CACHE.set(track.id, fallback);
        setLyricsLines(fallback);
        setLyricsLoading(false);
      });
  }, [track?.id, track?.title, track?.artist, track?.duration]);

  useEffect(() => {
    fetchLyrics();
  }, [track?.id, fetchLyrics]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const layout = lineLayouts.current[activeIndex];
    if (!layout || !lyricsContainerHeight.current) return;
    const targetY = layout.y + layout.height / 2 - lyricsContainerHeight.current * 0.45;
    scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
  }, [activeIndex]);

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

  return (
    <View style={[styles.lyricsContainer, { overflow: 'hidden' }]}>
      {!lyricsLoading && lyricsLines.length > 0 && lyricsLines[0].time !== -1 && (
        <View style={styles.floatingActionBar}>
          <TouchableOpacity
            onPress={() => fetchLyrics(true)}
            activeOpacity={0.7}
            style={{ padding: 8, marginRight: 2 }}
          >
            <Feather name="refresh-cw" size={15} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShareLyrics}
            activeOpacity={0.7}
            style={{ padding: 8 }}
          >
            <Feather name="share-2" size={15} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
        </View>
      )}

      {lyricsLoading ? (
        <ActivityIndicator size="large" color="#fff" />
      ) : lyricsLines.length === 0 || (lyricsLines.length === 1 && (lyricsLines[0].text === 'Lyrics not found' || lyricsLines[0].text === 'Lyrics not available')) ? (
        <View style={styles.fallbackContainer}>
          <Text style={styles.fallbackText}>
            {lyricsLines.length === 1 ? lyricsLines[0].text : 'Lyrics not found'}
          </Text>
          <Text style={styles.providerText}>
            Lyrics provided by LrcLib & SimpMusic
          </Text>
          <TouchableOpacity
            onPress={() => fetchLyrics(true)}
            activeOpacity={0.7}
            style={styles.refetchButton}
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
                onPress={() => { if (item.time >= 0) onSeek(item.time + 0.25); }}
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

          <View style={styles.footerContainer}>
            <Text style={styles.providerText}>
              Lyrics provided by LrcLib & SimpMusic
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lyricsContainer: {
    justifyContent: 'center',
    width: width - 32,
    height: '100%',
    borderRadius: 12,
  },
  floatingActionBar: {
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
    elevation: 5,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fallbackText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 16,
  },
  providerText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  refetchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  refetchButtonFooter: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
  footerContainer: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 220,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    marginTop: 20,
  },
});
