import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  clamp,
} from 'react-native-reanimated';

interface SliderProps extends ViewProps {
  value?: number;
  min?: number;
  max?: number;
  onValueChange?: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  disabled?: boolean;
  vertical?: boolean;
}

export function Slider({
  value = 0,
  min = 0,
  max = 100,
  onValueChange,
  onSlidingComplete,
  disabled,
  vertical = false,
  style,
  ...props
}: SliderProps) {
  const { colors } = useAppTheme();
  const trackSize = useSharedValue(0);
  const position = useSharedValue(clamp(((value - min) / (max - min)) * 100, 0, 100));

  React.useEffect(() => {
    position.value = clamp(((value - min) / (max - min)) * 100, 0, 100);
  }, [value, min, max]);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      if (trackSize.value === 0) return;
      const val = vertical ? e.y : e.x;
      const ratio = clamp(vertical ? (1 - val / trackSize.value) : (val / trackSize.value), 0, 1);
      position.value = ratio * 100;
      if (onValueChange) {
        runOnJS(onValueChange)(min + ratio * (max - min));
      }
    })
    .onEnd(() => {
      if (onSlidingComplete) {
        const ratio = position.value / 100;
        runOnJS(onSlidingComplete)(min + ratio * (max - min));
      }
    });

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((e) => {
      if (trackSize.value === 0) return;
      const val = vertical ? e.y : e.x;
      const ratio = clamp(vertical ? (1 - val / trackSize.value) : (val / trackSize.value), 0, 1);
      position.value = ratio * 100;
      if (onValueChange) {
        runOnJS(onValueChange)(min + ratio * (max - min));
      }
      if (onSlidingComplete) {
        runOnJS(onSlidingComplete)(min + ratio * (max - min));
      }
    });

  const thumbStyle = useAnimatedStyle(() => {
    if (vertical) {
      return {
        bottom: `${position.value}%`,
        left: '50%',
        marginLeft: -10, // Center thumb horizontally relative to vertical track
        marginBottom: -10, // Center thumb vertically on current position
      };
    }
    return {
      left: `${position.value}%`,
    };
  });

  const progressStyle = useAnimatedStyle(() => {
    if (vertical) {
      return {
        height: `${position.value}%`,
        width: '100%',
        bottom: 0,
      };
    }
    return {
      width: `${position.value}%`,
      height: '100%',
    };
  });

  return (
    <View
      style={[
        vertical ? styles.containerVertical : styles.container,
        style
      ]}
      onLayout={(e) => {
        trackSize.value = vertical 
          ? e.nativeEvent.layout.height 
          : e.nativeEvent.layout.width;
      }}
      {...props}
    >
      <GestureDetector gesture={Gesture.Simultaneous(pan, tap)}>
        <View style={vertical ? styles.hitSlopVertical : styles.hitSlop}>
          <View
            style={[
              vertical ? styles.trackVertical : styles.track,
              { backgroundColor: colors.secondary },
              disabled && { opacity: 0.5 },
            ]}
          >
            <Animated.View
              style={[
                styles.progress,
                { backgroundColor: colors.primary },
                progressStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.thumb,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.primary,
                },
                thumbStyle,
              ]}
            />
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 32,
    justifyContent: 'center',
  },
  containerVertical: {
    height: '100%',
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitSlop: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  hitSlopVertical: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  trackVertical: {
    width: 6,
    height: '100%',
    borderRadius: 3,
    position: 'relative',
  },
  progress: {
    borderRadius: 3,
    position: 'absolute',
    left: 0,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    position: 'absolute',
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
});
