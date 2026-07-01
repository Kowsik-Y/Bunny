import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  withDelay,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const LOGO = require('@/assets/images/logo.png');

// Animated equalizer bar
function EqualizerBar({
  delay,
  color,
}: {
  delay: number;
  color: string;
}) {
  const scaleY = useSharedValue(0.3);

  useEffect(() => {
    scaleY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.2, { duration: 400, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

type Props = {
  onFinish: () => void;
};

export default function LoadingScreen({ onFinish }: Props) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const logoTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const barsOpacity = useSharedValue(0);
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // Logo entrance
    logoOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    logoScale.value = withSpring(1, { damping: 14, stiffness: 90 });
    logoTranslateY.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) });

    // Subtitle entrance
    subtitleOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    // Bars entrance
    barsOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));

    // Fade out entire screen after 2.2s
    screenOpacity.value = withDelay(
      2200,
      withTiming(0, { duration: 400, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      })
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoTranslateY.value },
    ],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [
      { translateY: interpolate(subtitleOpacity.value, [0, 1], [8, 0]) },
    ],
  }));

  const barsStyle = useAnimatedStyle(() => ({
    opacity: barsOpacity.value,
  }));

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const BAR_COLORS = [
    'rgba(139,92,246,0.9)',   // violet
    'rgba(167,139,250,0.8)',  // violet-lighter
    'rgba(196,181,253,0.9)',  // lavender
    'rgba(139,92,246,0.7)',   // violet
    'rgba(109,40,217,0.9)',   // deep violet
  ];

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      {/* Glow blobs */}
      <View style={[styles.glowBlob, styles.glow1]} />
      <View style={[styles.glowBlob, styles.glow2]} />

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      {/* App name */}
      <Animated.Text style={[styles.appName, subtitleStyle]}>
        Bunny
      </Animated.Text>

      <Animated.Text style={[styles.tagline, subtitleStyle]}>
        Your music, everywhere
      </Animated.Text>

      {/* Equalizer animation */}
      <Animated.View style={[styles.equalizerRow, barsStyle]}>
        {BAR_COLORS.map((color, i) => (
          <EqualizerBar key={i} delay={i * 80} color={color} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0a0a12',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  glowBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  glow1: {
    width: 280,
    height: 280,
    backgroundColor: 'rgba(109,40,217,0.18)',
    top: height * 0.15,
    left: width * 0.1,
  },
  glow2: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(139,92,246,0.12)',
    bottom: height * 0.2,
    right: width * 0.05,
  },
  logoWrap: {
    width: 140,
    height: 140,
    marginBottom: 20,
    // Glow shadow
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(196,181,253,0.8)',
    letterSpacing: 0.5,
    marginBottom: 48,
    fontWeight: '400',
  },
  equalizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
  },
  bar: {
    width: 5,
    height: 28,
    borderRadius: 3,
  },
});
