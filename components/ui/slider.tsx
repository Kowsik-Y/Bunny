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
  disabled?: boolean;
}

export function Slider({
  value = 0,
  min = 0,
  max = 100,
  onValueChange,
  disabled,
  style,
  ...props
}: SliderProps) {
  const { colors } = useAppTheme();
  const trackWidth = useSharedValue(0);
  const position = useSharedValue(((value - min) / (max - min)) * 100);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      const ratio = clamp(e.x / trackWidth.value, 0, 1);
      position.value = ratio * 100;
      if (onValueChange) {
        runOnJS(onValueChange)(min + ratio * (max - min));
      }
    });

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((e) => {
      const ratio = clamp(e.x / trackWidth.value, 0, 1);
      position.value = ratio * 100;
      if (onValueChange) {
        runOnJS(onValueChange)(min + ratio * (max - min));
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    left: `${position.value}%`,
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${position.value}%`,
  }));

  return (
    <View
      style={[styles.container, style]}
      onLayout={(e) => (trackWidth.value = e.nativeEvent.layout.width)}
      {...props}
    >
      <GestureDetector gesture={Gesture.Simultaneous(pan, tap)}>
        <View style={styles.hitSlop}>
          <View
            style={[
              styles.track,
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
  hitSlop: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  track: {
    height: 6,
    width: '100%',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  progress: {
    height: '100%',
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
