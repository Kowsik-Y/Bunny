import React, { useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const SkeletonRow = React.memo(({ opacity, delay }: { opacity: Animated.Value; delay: number }) => {
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 0.15, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);

  return (
    <Animated.View style={[skeletonStyles.row, { opacity }]}>
      <View style={skeletonStyles.art} />
      <View style={skeletonStyles.info}>
        <View style={[skeletonStyles.line, { width: '65%' }]} />
        <View style={[skeletonStyles.line, { width: '40%', marginTop: 6, opacity: 0.6 }]} />
      </View>
      <View style={skeletonStyles.grip} />
    </Animated.View>
  );
});

const SKELETON_COUNT = 6;
const skeletonOpacities = Array.from({ length: SKELETON_COUNT }, () => new Animated.Value(0.3));

export function QueueSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      <View style={skeletonStyles.sectionHeader} />
      {skeletonOpacities.map((op, i) => (
        <SkeletonRow key={i} opacity={op} delay={i * 80} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    height: '100%',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    height: 12,
    width: 80,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  art: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 12,
  },
  info: { flex: 1 },
  line: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  grip: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 12,
  },
});
