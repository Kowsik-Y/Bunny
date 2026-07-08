import { StyleSheet, View, ScrollView, Pressable, Platform, Linking, Image, Text, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { Github, ChevronRight, AlertCircle } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { H1, H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import packageJson from '../../package.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const OVERLAY_LOGO_SIZE = 140;

export default function AboutSettingsScreen() {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';

  // Refs for dynamic layouts measurement
  const containerRef = useRef<View>(null);
  const targetLogoRef = useRef<View>(null);
  const targetCoords = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  // States
  const [isMeasured, setIsMeasured] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Animated shared values
  const overlayOpacity = useSharedValue(1);
  const logoX = useSharedValue(SCREEN_WIDTH / 2 - OVERLAY_LOGO_SIZE / 2);
  const logoY = useSharedValue(SCREEN_HEIGHT / 2 - OVERLAY_LOGO_SIZE / 2 - 40); // Visually balanced y offset
  const logoScale = useSharedValue(0.1);
  const logoOpacity = useSharedValue(0);

  // Soundwave ripples shared values
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);
  const ring3Scale = useSharedValue(1);
  const ring3Opacity = useSharedValue(0);

  // Brand text on splash shared values
  const splashTextOpacity = useSharedValue(0);
  const splashTextTranslateY = useSharedValue(20);

  // Scroll Content entrance animation shared values
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(40);

  // Calculate layout coordinates relative to container
  const measureLayouts = () => {
    if (isMeasured) return;

    containerRef.current?.measure((cx, cy, cWidth, cHeight, cPageX, cPageY) => {
      targetLogoRef.current?.measure((tx, ty, tWidth, tHeight, tPageX, tPageY) => {
        if (tWidth === 0 || tHeight === 0) return;

        const relativeX = tPageX - cPageX;
        const relativeY = tPageY - cPageY;

        targetCoords.current = {
          x: relativeX,
          y: relativeY,
          width: tWidth,
          height: tHeight,
        };
        setIsMeasured(true);
      });
    });
  };

  const handleTargetLayout = () => {
    // 100ms layout stabilization delay
    setTimeout(measureLayouts, 100);
  };

  useEffect(() => {
    // 1. Concentric ring ripple animation loops
    ring1Scale.value = 1;
    ring1Opacity.value = 0.6;
    ring1Scale.value = withRepeat(
      withTiming(3.2, { duration: 2000, easing: Easing.out(Easing.quad) }),
      -1,
      false
    );
    ring1Opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 200 }),
        withTiming(0, { duration: 1800, easing: Easing.out(Easing.quad) })
      ),
      -1,
      false
    );

    ring2Scale.value = 1;
    ring2Opacity.value = 0;
    ring2Scale.value = withDelay(
      600,
      withRepeat(
        withTiming(3.2, { duration: 2000, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
    ring2Opacity.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 200 }),
          withTiming(0, { duration: 1800, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      )
    );

    ring3Scale.value = 1;
    ring3Opacity.value = 0;
    ring3Scale.value = withDelay(
      1200,
      withRepeat(
        withTiming(3.2, { duration: 2000, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
    ring3Opacity.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 200 }),
          withTiming(0, { duration: 1800, easing: Easing.out(Easing.quad) })
        ),
        -1,
        false
      )
    );

    // 2. Logo visual pop-in & text fade-in delayed by 2 seconds (ping animation plays first)
    logoScale.value = withDelay(2000, withTiming(1.0, { duration: 450, easing: Easing.out(Easing.cubic) }));
    logoOpacity.value = withDelay(2000, withTiming(1.0, { duration: 450 }));

    splashTextOpacity.value = withDelay(2250, withTiming(1.0, { duration: 550 }));
    splashTextTranslateY.value = withDelay(2250, withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, []);

  useEffect(() => {
    if (!isMeasured) return;

    let finishTimer: NodeJS.Timeout;

    // 3. Play splash state for 3.8s (2s ping, ~0.8s logo pop-in, 1s settle), then execute morph transition
    const timer = setTimeout(() => {
      // Fade ripples and brand text to zero
      ring1Opacity.value = withTiming(0, { duration: 300 });
      ring2Opacity.value = withTiming(0, { duration: 300 });
      ring3Opacity.value = withTiming(0, { duration: 300 });
      splashTextOpacity.value = withTiming(0, { duration: 350 });
      splashTextTranslateY.value = withTiming(25, { duration: 350 });

      // Retrieve coordinates or use fallback
      const target = targetCoords.current || {
        x: SCREEN_WIDTH / 2 - 40,
        y: 200,
        width: 80,
        height: 80,
      };

      const targetScaleFactor = target.width / OVERLAY_LOGO_SIZE;
      const targetLogoX = target.x + target.width / 2 - OVERLAY_LOGO_SIZE / 2;
      const targetLogoY = target.y + target.height / 2 - OVERLAY_LOGO_SIZE / 2;

      // Morph transitions
      logoX.value = withTiming(targetLogoX, { duration: 700, easing: Easing.out(Easing.cubic) });
      logoY.value = withTiming(targetLogoY, { duration: 700, easing: Easing.out(Easing.cubic) });
      logoScale.value = withTiming(targetScaleFactor, { duration: 700, easing: Easing.out(Easing.cubic) });

      // Overlay gradient fade
      overlayOpacity.value = withTiming(0, { duration: 700 });

      // Reveal card lists
      contentOpacity.value = withDelay(150, withTiming(1, { duration: 600 }));
      contentTranslateY.value = withDelay(150, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));

      // Remove overlay completely when morph animations finish settling
      finishTimer = setTimeout(() => {
        setAnimationComplete(true);
      }, 950);
    }, 3800);

    return () => {
      clearTimeout(timer);
      if (finishTimer) {
        clearTimeout(finishTimer);
      }
    };
  }, [isMeasured]);

  // Animated styles bindings
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const ring1AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));

  const ring2AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));

  const ring3AnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  const splashTextAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashTextOpacity.value,
    transform: [{ translateY: splashTextTranslateY.value }],
  }));

  const animatingLogoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { translateX: logoX.value },
      { translateY: logoY.value },
      { scale: logoScale.value },
    ],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const gradientColors = (isDark 
    ? [colors.background, '#0e0b1e'] 
    : [colors.background, '#f5f3ff']) as [string, string];

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'About' }} />

      <View ref={containerRef} style={styles.containerWrapper}>
        {/* Ambient background glow */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LinearGradient
            colors={isDark ? ['#8E2DE2', '#4A00E0'] : ['#e9dbff', '#d9c4ff']}
            style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.22 : 0.4 }]}
          />
          <LinearGradient
            colors={['transparent', colors.background]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.6 }}
          />
        </View>

        {/* Main scrollable layout content */}
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
          style={contentAnimatedStyle}
        >
          <Text style={[styles.floatingTitle, { color: colors.text }]}>About</Text>
          <BunnyCard style={styles.settingCard}>
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <View
                ref={targetLogoRef}
                onLayout={handleTargetLayout}
                style={{
                  width: 80,
                  height: 80,
                  marginBottom: 12,
                  opacity: animationComplete ? 1 : 0, // Switch to layouts logo once morph ends
                }}
              >
                {/* Outer bevel rim gradient */}
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']
                      : ['#FFFFFF', 'rgba(0,0,0,0.12)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.logoOuterRim}
                >
                  {/* Inner frosted glass surface */}
                  <LinearGradient
                    colors={
                      isDark
                        ? ['rgba(24,24,26,0.72)', 'rgba(38,38,41,0.72)']
                        : ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.85)']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={styles.logoInnerGlass}
                  >
                    {Platform.OS === 'ios' && (
                      <BlurView
                        intensity={60}
                        tint={isDark ? 'dark' : 'light'}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <Image
                      source={require('@/assets/images/logo.png')}
                      style={{ width: '92%', height: '92%', resizeMode: 'contain', backgroundColor: 'transparent' }}
                    />
                  </LinearGradient>
                </LinearGradient>
              </View>
              <H3 style={{ fontWeight: '800' }}>Bunny</H3>
              <Muted>Elegant Music Player</Muted>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, gap: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography style={{ color: colors.mutedForeground }}>Version</Typography>
                <Typography style={{ fontWeight: '600' }}>{packageJson.version}</Typography>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography style={{ color: colors.mutedForeground }}>Type</Typography>
                <Typography style={{ fontWeight: '600' }}>{__DEV__ ? 'Debug Build' : 'Release Build'}</Typography>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography style={{ color: colors.mutedForeground }}>Architecture</Typography>
                <Typography style={{ fontWeight: '600' }}>{Platform.OS === 'android' ? 'arm64-v8a' : 'Universal'}</Typography>
              </View>
            </View>
          </BunnyCard>

          <H3 style={styles.sectionTitle}>Links & Resources</H3>
          <BunnyCard style={styles.settingCard}>
            <Pressable onPress={() => Linking.openURL('https://github.com/Kowsik-Y')} style={styles.settingRow}>
              <View style={styles.iconContainer}>
                <Github size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">GitHub Profile</Typography>
                <Muted>Check out the developer profile</Muted>
              </View>
              <ChevronRight size={20} color={colors.mutedForeground} />
            </Pressable>
            <Pressable onPress={() => Linking.openURL('https://github.com/Kowsik-Y/Bunny/issues/new')} style={[styles.settingRow, { marginBottom: 0 }]}>
              <View style={styles.iconContainer}>
                <AlertCircle size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Report an Issue</Typography>
                <Muted>Create a bug report or suggest feature</Muted>
              </View>
              <ChevronRight size={20} color={colors.mutedForeground} />
            </Pressable>
          </BunnyCard>
        </Animated.ScrollView>

        {/* Dynamic transition splash overlay */}
        {!animationComplete && (
          <Animated.View
            style={[
              styles.overlay,
              overlayAnimatedStyle,
            ]}
          >
            <LinearGradient
              colors={gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Glowing ripple circles */}
            <View style={styles.ringsContainer} pointerEvents="none">
              <Animated.View
                style={[
                  styles.rippleRing,
                  { borderColor: colors.primary + '30' },
                  ring1AnimatedStyle,
                ]}
              />
              <Animated.View
                style={[
                  styles.rippleRing,
                  { borderColor: colors.primary + '20' },
                  ring2AnimatedStyle,
                ]}
              />
              <Animated.View
                style={[
                  styles.rippleRing,
                  { borderColor: colors.primary + '10' },
                  ring3AnimatedStyle,
                ]}
              />
            </View>

            {/* Centered Animating Logo */}
            <Animated.View
              style={[
                styles.animatingLogoContainer,
                animatingLogoStyle,
              ]}
            >
              {/* Outer bevel rim gradient */}
              <LinearGradient
                colors={
                  isDark
                    ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']
                    : ['#FFFFFF', 'rgba(0,0,0,0.12)']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.logoOuterRimOverlay}
              >
                {/* Inner frosted glass surface */}
                <LinearGradient
                  colors={
                    isDark
                      ? ['rgba(24,24,26,0.72)', 'rgba(38,38,41,0.72)']
                      : ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.85)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.logoInnerGlassOverlay}
                >
                  {Platform.OS === 'ios' && (
                    <BlurView
                      intensity={60}
                      tint={isDark ? 'dark' : 'light'}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <Image
                    source={require('@/assets/images/logo.png')}
                    style={{ width: '92%', height: '92%', resizeMode: 'contain' }}
                  />
                </LinearGradient>
              </LinearGradient>
            </Animated.View>

            {/* Brand text below logo on splash */}
            <Animated.View
              style={[
                styles.splashTextContainer,
                splashTextAnimatedStyle,
              ]}
            >
              <H1 style={{ fontWeight: '900', fontSize: 36, color: colors.text }}>Bunny</H1>
              <Muted style={{ fontSize: 16 }}>Elegant Music Player</Muted>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  titleText: {
    fontSize: 28,
  },
  containerWrapper: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 100,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  ringsContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleRing: {
    position: 'absolute',
    width: OVERLAY_LOGO_SIZE,
    height: OVERLAY_LOGO_SIZE,
    borderRadius: OVERLAY_LOGO_SIZE / 2,
    borderWidth: 2,
  },
  animatingLogoContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: OVERLAY_LOGO_SIZE,
    height: OVERLAY_LOGO_SIZE,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  logoOuterRim: {
    width: 80,
    height: 80,
    borderRadius: 24,
    padding: 1.2,
  },
  logoInnerGlass: {
    borderRadius: 22.8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoOuterRimOverlay: {
    width: OVERLAY_LOGO_SIZE,
    height: OVERLAY_LOGO_SIZE,
    borderRadius: 42,
    padding: 2.1,
  },
  logoInnerGlassOverlay: {
    borderRadius: 39.9,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  splashTextContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: SCREEN_HEIGHT / 2 - 40 + OVERLAY_LOGO_SIZE / 2 + 16, // Placed exactly below the logo's center with offset
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
});
