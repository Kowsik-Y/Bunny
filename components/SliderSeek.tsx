import React, { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  clamp,
  useAnimatedReaction,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAppTheme } from '@/contexts/app-theme-context';

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 14;
const THUMB_SIZE_ACTIVE = 20;
const ANIM_DURATION = 140;

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${m}:${ss < 10 ? '0' : ''}${ss}`;
};

type SeekSliderProps = {
  position: number;
  duration: number;
  buffered?: number;
  onSeek: (positionSeconds: number) => void;
  trackHeight?: number;
  thumbSize?: number;
  thumbSizeActive?: number;
  // All color props optional — theme used as default
  colorFilled?: string;
  colorUnfilled?: string;
  colorThumb?: string;
  colorBuffered?: string;
  showTimestamps?: boolean;
};

const SeekSlider = ({
  position,
  duration,
  buffered = 0,
  onSeek,
  trackHeight = TRACK_HEIGHT,
  thumbSize = THUMB_SIZE,
  thumbSizeActive = THUMB_SIZE_ACTIVE,
  colorFilled,
  colorUnfilled,
  colorThumb,
  colorBuffered,
  showTimestamps = true,
}: SeekSliderProps) => {
  const { colors } = useAppTheme();

  // Use prop override if provided, otherwise fall back to theme token
  const filled = colorFilled ?? colors.tint;
  const unfilled = colorUnfilled ?? colors.border;
  const thumb = colorThumb ?? colors.tint;
  const bufferedColor = colorBuffered ?? colors.accent;
  const tooltipBg = colors.primary;
  const tooltipFg = colors.primaryForeground;
  const timeFg = colors.mutedForeground;

  const trackWidth = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const dragRatio = useSharedValue(0);
  const displayRatio = useSharedValue(0);

  const [label, setLabel] = React.useState(fmt(0));

  const updateLabel = React.useCallback((val: number) => {
    setLabel(fmt(val));
  }, []);

  useAnimatedReaction(
    () => dragRatio.value * duration,
    (val) => {
      runOnJS(updateLabel)(val);
    },
    [duration, updateLabel]
  );

  const progress = duration > 0 ? position / duration : 0;
  const bufRatio = duration > 0 ? buffered / duration : 0;

  useEffect(() => {
    if (!isDragging.value) {
      displayRatio.value = progress;
    }
  }, [progress]);

  const onTrackLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
  }, []);

  const pan = Gesture.Pan()
    .minDistance(0)
    .onStart((e) => {
      isDragging.value = true;
      const ratio = clamp(e.x / trackWidth.value, 0, 1);
      dragRatio.value = ratio;
      displayRatio.value = ratio;
    })
    .onUpdate((e) => {
      const ratio = clamp(e.x / trackWidth.value, 0, 1);
      dragRatio.value = ratio;
      displayRatio.value = ratio;
    })
    .onEnd(() => {
      isDragging.value = false;
      runOnJS(onSeek)(dragRatio.value * duration);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    const ratio = clamp(e.x / trackWidth.value, 0, 1);
    displayRatio.value = ratio;
    runOnJS(onSeek)(ratio * duration);
  });

  const composed = Gesture.Simultaneous(pan, tap);

  const filledStyle = useAnimatedStyle(() => ({
    width: `${displayRatio.value * 100}%`,
  }));

  const bufferedStyle = useAnimatedStyle(() => ({
    width: `${Math.min(bufRatio * 100, 100)}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const size = isDragging.value
      ? withTiming(thumbSizeActive, { duration: ANIM_DURATION })
      : withTiming(thumbSize, { duration: ANIM_DURATION });
    return {
      width: size,
      height: size,
      borderRadius: thumbSizeActive / 2,
      left: `${displayRatio.value * 100}%`,
      marginLeft: -(thumbSizeActive / 2),
      shadowOpacity: isDragging.value
        ? withTiming(0.32, { duration: ANIM_DURATION })
        : withTiming(0.16, { duration: ANIM_DURATION }),
    };
  });

  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value
      ? withTiming(1, { duration: 100 })
      : withTiming(0, { duration: 100 }),
    left: `${displayRatio.value * 100}%`,
    transform: [{ translateX: -20 }],
  }));

  return (
    <View style={styles.wrapper}>
      {/* Floating tooltip */}
      <Animated.View
        style={[styles.tooltip, tooltipStyle, { backgroundColor: tooltipBg }]}
        pointerEvents="none"
      >
        <Text style={[styles.tooltipText, { color: tooltipFg }]}>
          {label}
        </Text>
      </Animated.View>

      {/* Track + gesture area */}
      <GestureDetector gesture={composed}>
        <View
          style={[styles.hitArea, { paddingVertical: (20 - trackHeight) / 2 }]}
          onLayout={onTrackLayout}
        >
          <View
            style={[
              styles.track,
              {
                height: trackHeight,
                backgroundColor: unfilled,
                borderRadius: trackHeight / 2,
              },
            ]}
          >
            {/* Buffered */}
            <Animated.View
              style={[
                styles.fill,
                bufferedStyle,
                { backgroundColor: bufferedColor, borderRadius: trackHeight / 2 },
              ]}
            />
            {/* Played */}
            <Animated.View
              style={[
                styles.fill,
                filledStyle,
                { backgroundColor: filled, borderRadius: trackHeight / 2 },
              ]}
            />
            {/* Thumb */}
            <Animated.View
              style={[
                styles.thumb,
                thumbStyle,
                {
                  top: -(thumbSizeActive / 2) + trackHeight / 2,
                  backgroundColor: thumb,
                  ...Platform.select({
                    ios: {
                      shadowColor: thumb,
                    },
                  }),
                },
              ]}
            />
          </View>
        </View>
      </GestureDetector>

      {/* Timestamps */}
      {showTimestamps && (
        <View style={styles.timestamps}>
          <Text style={[styles.time, { color: timeFg }]}>{fmt(position)}</Text>
          <Text style={[styles.time, { color: timeFg }]}>{fmt(duration)}</Text>
        </View>
      )}
    </View>
  );
};

export default SeekSlider;

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  tooltip: {
    position: 'absolute',
    top: -15,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 10,
  },
  tooltipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hitArea: {
    width: '100%',
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  timestamps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  time: {
    fontSize: 11,
  },
});