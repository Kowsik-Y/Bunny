import React, { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing, Pressable, View, LayoutChangeEvent, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolate, runOnJS } from 'react-native-reanimated';
import { usePlayerAnimation } from '@/contexts/player-animation-context';
import { type BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/contexts/app-theme-context';
import { TAB_BAR_BOTTOM, PLAYER_BOTTOM_OFFSET } from '@/constants/layout';

const VISIBLE_ROUTES = ['index', 'radio', 'explore', 'profile'];

const ROUTE_ICONS: Record<string, any> = {
  index: 'house.fill',
  explore: 'paperplane.fill',
  radio: 'antenna.radiowaves.left.and.right',
  profile: 'person.fill',
};

const PILL_H = 50;

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const { translateY, snapCollapsed, bottomOffset } = usePlayerAnimation();

  useEffect(() => {
    bottomOffset.value = PLAYER_BOTTOM_OFFSET;
    return () => {
      bottomOffset.value = 0;
    };
  }, []);

  const pillX = useRef(new RNAnimated.Value(0)).current;
  const pillW = useRef(new RNAnimated.Value(0)).current;
  const pillScale = useRef(new RNAnimated.Value(1)).current;

  // Use a record with route names as keys for reliable layout tracking
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const measuredCount = useRef(0);
  const [ready, setReady] = useState(false);

  const activeRouteName = state.routes[state.index].name;

  const startX = useRef(0);
  const lastTargetIndex = useRef(-1);

  const tabPanGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      const activeLayout = tabLayouts.current[activeRouteName];
      if (activeLayout) {
        startX.current = activeLayout.x;
      }
      lastTargetIndex.current = VISIBLE_ROUTES.indexOf(activeRouteName);
      RNAnimated.timing(pillScale, {
        toValue: 1.15,
        duration: 160,
        useNativeDriver: false,
      }).start();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    })
    .onUpdate((e) => {
      const layout = tabLayouts.current[activeRouteName];
      if (layout) {
        let nextX = startX.current + e.translationX;
        const firstRoute = VISIBLE_ROUTES[0];
        const lastRoute = VISIBLE_ROUTES[VISIBLE_ROUTES.length - 1];
        const minLayout = tabLayouts.current[firstRoute];
        const maxLayout = tabLayouts.current[lastRoute];

        if (minLayout && maxLayout) {
          nextX = Math.max(minLayout.x, Math.min(maxLayout.x, nextX));
        }

        pillX.setValue(nextX);

        // Drag tick haptics
        let closestIndex = lastTargetIndex.current;
        let minDiff = Infinity;
        VISIBLE_ROUTES.forEach((routeName, idx) => {
          const tabLayout = tabLayouts.current[routeName];
          if (tabLayout) {
            const diff = Math.abs(tabLayout.x - nextX);
            if (diff < minDiff) {
              minDiff = diff;
              closestIndex = idx;
            }
          }
        });

        if (closestIndex !== lastTargetIndex.current) {
          lastTargetIndex.current = closestIndex;
          Haptics.selectionAsync().catch(() => { });
        }
      }
    })
    .onEnd((e) => {
      RNAnimated.spring(pillScale, {
        toValue: 1,
        useNativeDriver: false,
      }).start();

      const finalX = startX.current + e.translationX;

      let closestRoute = activeRouteName;
      let minDiff = Infinity;

      Object.entries(tabLayouts.current).forEach(([routeName, layout]) => {
        if (!VISIBLE_ROUTES.includes(routeName)) return;
        const diff = Math.abs(layout.x - finalX);
        if (diff < minDiff) {
          minDiff = diff;
          closestRoute = routeName;
        }
      });

      if (closestRoute !== activeRouteName) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
        navigation.navigate(closestRoute as any);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        const layout = tabLayouts.current[activeRouteName];
        if (layout) {
          RNAnimated.spring(pillX, {
            toValue: layout.x,
            useNativeDriver: false,
          }).start();
        }
      }
    });

  const slideTo = (routeName: string, animate = true) => {
    const layout = tabLayouts.current[routeName];
    if (!layout) return;
    if (!animate) {
      pillX.setValue(layout.x);
      pillW.setValue(layout.width);
      return;
    }
    RNAnimated.parallel([
      RNAnimated.timing(pillX, {
        toValue: layout.x,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      RNAnimated.timing(pillW, {
        toValue: layout.width,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  };

  useEffect(() => {
    if (ready) slideTo(activeRouteName);
  }, [activeRouteName, ready]);

  const onTabLayout = (routeName: string, e: LayoutChangeEvent) => {
    if (tabLayouts.current[routeName]) return; // Already measured

    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[routeName] = { x, width };
    measuredCount.current += 1;

    if (measuredCount.current === VISIBLE_ROUTES.length) {
      setReady(true);
      slideTo(activeRouteName, false);
    }
  };

  const tabContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            translateY.value,
            [0, snapCollapsed.value],
            [150, 0],
            Extrapolate.CLAMP
          ),
        },
      ],
      opacity: interpolate(
        translateY.value,
        [0, snapCollapsed.value * 0.5],
        [0, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  const isDark = colors.background !== '#ffffff';

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, tabContainerStyle]}>
      <GestureDetector gesture={tabPanGesture}>
        <View
          style={{
            position: 'absolute',
            bottom: TAB_BAR_BOTTOM,
            left: 24,
            right: 24,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 999,
            paddingVertical: 8,
            paddingHorizontal: 8,
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 999, backgroundColor: isDark ? "rgba(10, 10, 10, 0.6)" : "rgba(255, 255, 255, 0.65)" }]} pointerEvents="none">
            <BlurView
              intensity={70}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <RNAnimated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: pillX,
              width: pillW,
              height: PILL_H,
              borderRadius: PILL_H / 2,
              backgroundColor: colors.tint,
              transform: [
                { scale: pillScale }
              ]
            }}
          >
            <View style={{ position: 'absolute', top: -12, left: '20%', width: 10, height: 18, backgroundColor: colors.tint, borderTopLeftRadius: 10, borderTopRightRadius: 10, transform: [{ rotate: '-15deg' }] }} />
            <View style={{ position: 'absolute', top: -12, right: '20%', width: 10, height: 18, backgroundColor: colors.tint, borderTopLeftRadius: 10, borderTopRightRadius: 10, transform: [{ rotate: '15deg' }] }} />
          </RNAnimated.View>

          {state.routes.map((route, index) => {
            if (!VISIBLE_ROUTES.includes(route.name)) return null;

            const isFocused = state.index === index;
            const icon = ROUTE_ICONS[route.name] ?? 'house.fill';

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                onLayout={(e) => onTabLayout(route.name, e)}
                accessibilityRole="button"
                accessibilityLabel={route.name}
                accessibilityState={{ selected: isFocused }}
                hitSlop={6}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 15,
                }}
              >
                <IconSymbol
                  size={20}
                  name={icon}
                  color={isFocused ? colors.background : colors.tabIconDefault}
                  active={isFocused}
                />
              </Pressable>
            );
          })}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}