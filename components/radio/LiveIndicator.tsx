import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Typography } from '@/components/ui/typography';

export function LiveIndicator() {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withRepeat(
      withSequence(withTiming(0.3, { duration: 500 }), withTiming(1, { duration: 500 })),
      -1,
      true
    ),
    transform: [{ scale: withRepeat(withTiming(1.2, { duration: 1000 }), -1, true) }],
  }));

  return (
    <View style={styles.liveWrapper}>
      <Animated.View style={[styles.liveDot, animatedStyle]} />
      <Typography variant="small" style={styles.liveText}>
        LIVE
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  liveWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  liveText: {
    color: '#FF3B30',
    fontWeight: '700',
    fontSize: 10,
  },
});
