import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/contexts/app-theme-context';
import { ThemedText } from '../themed-text';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

const MINI_H      = 64;
const MINI_BOTTOM = 100;

type Track = {
  title:   string;
  artist:  string;
  artwork: string;
};

const TRACK: Track = {
  title:   'Blinding Lights',
  artist:  'The Weeknd',
  artwork: 'https://picsum.photos/seed/track/400/400',
};

export default function MiniPlayer() {
  const { colors } = useAppTheme();
  const insets     = useSafeAreaInsets();

  const [expanded, setExpanded] = useState(false);
  const [playing,  setPlaying]  = useState(false);

  // 0 = mini, 1 = full
  const progress = useRef(new Animated.Value(0)).current;

  const springTo = (toValue: number, onDone?: () => void) => {
    Animated.spring(progress, {
      toValue,
      useNativeDriver: false,
      damping: 30,
      stiffness: 280,
      mass: 1,
    }).start(onDone);
  };

  const expand  = () => springTo(1, () => setExpanded(true));
  const collpase = () => springTo(0, () => setExpanded(false));

  const panResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => {
      // Only steal the gesture if it's a meaningful intentional drag
      // and directionally correct (up to expand, down to collapse)
      const isDraggingUp   = g.dy < -12;
      const isDraggingDown = g.dy > 12;

      if (!expanded && isDraggingUp)   return true;  // mini → expand
      if (expanded  && isDraggingDown) return true;  // full → collapse
      return false;
    },
    onPanResponderGrant: () => {
      progress.stopAnimation();
    },
    onPanResponderMove: (_, g) => {
      const base  = expanded ? 1 : 0;
      const delta = (-g.dy) / SCREEN_H;
      progress.setValue(Math.min(1, Math.max(0, base + delta)));
    },
    onPanResponderRelease: (_, g) => {
      const base    = expanded ? 1 : 0;
      const delta   = (-g.dy) / SCREEN_H;
      const current = Math.min(1, Math.max(0, base + delta));

      // Closing: need clear intent — fast velocity OR dragged past 40%
      const shouldClose =
        (expanded && g.vy > 0.5) ||           // fast swipe down
        (expanded && current < 0.6 && g.vy >= 0); // dragged well past midpoint

      // Opening: fast swipe up OR dragged past 45%
      const shouldOpen =
        (!expanded && g.vy < -0.5) ||
        (!expanded && current > 0.45);

      if (shouldClose) {
        springTo(0, () => setExpanded(false));
      } else if (shouldOpen) {
        springTo(1, () => setExpanded(true));
      } else {
        // Snap back to wherever we started
        springTo(expanded ? 1 : 0);
      }
    },
  })
).current;

  // ─── Interpolations ──────────────────────────────────────────────────────

  const playerBottom = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [MINI_BOTTOM, 0],
  });

  const playerHeight = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [MINI_H, SCREEN_H],
  });

  const playerBorderRadius = progress.interpolate({
    inputRange:  [0, 0.3],
    outputRange: [20, 0],
    extrapolate: 'clamp',
  });

  const artworkSize = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [44, SCREEN_W - 64],
  });

  const artworkRadius = progress.interpolate({
    inputRange:  [0, 0.6],
    outputRange: [10, 20],
    extrapolate: 'clamp',
  });

  const artworkMarginTop = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [10, insets.top + 72],
  });

  const miniOpacity = progress.interpolate({
    inputRange:  [0, 0.2],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const fullOpacity = progress.interpolate({
    inputRange:  [0.55, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const closeBtnOpacity = progress.interpolate({
    inputRange:  [0.7, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const bgColor = progress.interpolate({
    inputRange:  [0, 1],
    outputRange: [colors.card ?? '#1c1c1e', '#111'],
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Animated.View
      style={{
        position:        'absolute',
        left:            8,
        right:           8,
        bottom:          playerBottom,
        height:          playerHeight,
        borderRadius:    playerBorderRadius,
        backgroundColor: bgColor,
        overflow:        'hidden',
        zIndex:          20,
        shadowColor:     '#000',
        shadowOffset:    { width: 0, height: 8 },
        shadowOpacity:   0.3,
        shadowRadius:    24,
        elevation:       20,
      }}
      {...panResponder.panHandlers}
    >
      {/* ── Top row: close btn (full) + drag handle ── */}
      <Animated.View
        style={{
          flexDirection:  'row',
          alignItems:     'center',
          justifyContent: 'center',
          paddingTop:     insets.top + 14,
          paddingHorizontal: 20,
          opacity:        fullOpacity,
        }}
        pointerEvents={expanded ? 'box-none' : 'none'}
      >
        {/* Left spacer = same width as close btn so handle stays centered */}
        <View style={{ width: 36 }} />

        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }} />
        </View>

        {/* Close chevron button */}
        <Animated.View style={{ opacity: closeBtnOpacity }}>
          <Pressable
            onPress={collpase}
            hitSlop={12}
            style={{
              width:           36,
              height:          36,
              borderRadius:    18,
              backgroundColor: 'rgba(255,255,255,0.1)',
              alignItems:      'center',
              justifyContent:  'center',
            }}
          >
            <IconSymbol size={18} name="chevron.down" color="#fff" />
          </Pressable>
        </Animated.View>
      </Animated.View>

      {/* ── Artwork (morphs from mini thumb → full square) ── */}
      <Pressable
        onPress={() => { if (!expanded) expand(); }}
        style={{ alignSelf: 'center' }}
      >
        <Animated.View
          style={{
            marginTop:    artworkMarginTop,
            width:        artworkSize,
            height:       artworkSize,
            borderRadius: artworkRadius,
            overflow:     'hidden',
          }}
        >
          <Image
            source={TRACK.artwork && TRACK.artwork.trim() !== '' ? { uri: TRACK.artwork } : require('@/assets/images/icon.png')}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        </Animated.View>
      </Pressable>

      {/* ── Mini bar row ── */}
      <Animated.View
        pointerEvents={expanded ? 'none' : 'box-none'}
        style={[
          StyleSheet.absoluteFill,
          {
            flexDirection:     'row',
            alignItems:        'center',
            paddingHorizontal: 16,
            opacity:           miniOpacity,
          },
        ]}
      >
        {/* Tap entire mini bar to expand */}
        <Pressable
          onPress={expand}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
        >
          {/* spacer for artwork */}
          <View style={{ width: 44 + 12 }} />

          <View style={{ flex: 1 }}>
            <ThemedText numberOfLines={1} style={{ fontSize: 13, fontWeight: '600' }}>
              {TRACK.title}
            </ThemedText>
            <ThemedText numberOfLines={1} style={{ fontSize: 12 }}>
              {TRACK.artist}
            </ThemedText>
          </View>
        </Pressable>

        <Pressable onPress={() => setPlaying(p => !p)} hitSlop={10} style={{ marginLeft: 12 }}>
          <IconSymbol size={26} name={playing ? 'pause.fill' : 'play.fill'} color={colors.text} />
        </Pressable>

        <Pressable hitSlop={10} style={{ marginLeft: 16 }}>
          <IconSymbol size={22} name="forward.fill" color={colors.text} />
        </Pressable>
      </Animated.View>

      {/* ── Full screen content ── */}
      <Animated.View
        pointerEvents={expanded ? 'box-none' : 'none'}
        style={{
          position:          'absolute',
          left:              0,
          right:             0,
          bottom:            0,
          paddingHorizontal: 32,
          paddingBottom:     insets.bottom + 40,
          opacity:           fullOpacity,
        }}
      >
        {/* Track info + like */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <View style={{ flex: 1 }}>
            <ThemedText style={{ color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 0.2 }}>
              {TRACK.title}
            </ThemedText>
            <ThemedText style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 4 }}>
              {TRACK.artist}
            </ThemedText>
          </View>
          <Pressable hitSlop={10}>
            <IconSymbol size={22} name="heart" color="rgba(255,255,255,0.4)" />
          </Pressable>
        </View>

        {/* Seek bar */}
        <View style={{ marginBottom: 28 }}>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <View style={{ width: '35%', height: '100%', borderRadius: 2, backgroundColor: '#fff' }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <ThemedText style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>1:24</ThemedText>
            <ThemedText style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>3:22</ThemedText>
          </View>
        </View>

        {/* Controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable hitSlop={10}>
            <IconSymbol size={22} name="shuffle" color="rgba(255,255,255,0.5)" />
          </Pressable>

          <Pressable hitSlop={10}>
            <IconSymbol size={30} name="backward.fill" color="#fff" />
          </Pressable>

          <Pressable
            onPress={() => setPlaying(p => !p)}
            style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: '#fff',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <IconSymbol size={28} name={playing ? 'pause.fill' : 'play.fill'} color="#000" />
          </Pressable>

          <Pressable hitSlop={10}>
            <IconSymbol size={30} name="forward.fill" color="#fff" />
          </Pressable>

          <Pressable hitSlop={10}>
            <IconSymbol size={22} name="repeat" color="rgba(255,255,255,0.5)" />
          </Pressable>
        </View>
      </Animated.View>
    </Animated.View>
  );
}