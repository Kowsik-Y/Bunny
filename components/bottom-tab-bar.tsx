import React, { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing, Pressable, View, LayoutChangeEvent, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, interpolate, Extrapolate, useSharedValue, withTiming } from 'react-native-reanimated';
import { usePlayerAnimation } from '@/contexts/player-animation-context';
import { type BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Home, Search, ListMusic, Podcast } from 'lucide-react-native';

import { useAppTheme } from '@/contexts/app-theme-context';
import { TAB_BAR_BOTTOM, PLAYER_BOTTOM_OFFSET } from '@/constants/layout';


const VISIBLE_ROUTES = ['index', 'radio', 'explore', 'profile'];

const PILL_H = 50;

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { translateY, snapCollapsed, bottomOffset } = usePlayerAnimation();

  const activeRouteName = state.routes[state.index].name;
  const isTabBarVisible = VISIBLE_ROUTES.includes(activeRouteName);
  
  const tabVisibility = useSharedValue(isTabBarVisible ? 1 : 0);

  const outerGradient: [string, string] = isDark 
    ? [colors.border, colors.background] 
    : ['#FFFFFF', colors.border];
  const innerGradient: [string, string] = isDark 
    ? [colors.card, colors.card] 
    : [colors.secondary, '#FFFFFF'];
  const earColors: [string, string] = isDark 
    ? [colors.border, colors.background] 
    : ['#FFFFFF', colors.border];

  useEffect(() => {
    tabVisibility.value = withTiming(isTabBarVisible ? 1 : 0, { duration: 250 });
    bottomOffset.value = isTabBarVisible ? PLAYER_BOTTOM_OFFSET : 0;
    return () => {
      bottomOffset.value = 0;
    };
  }, [isTabBarVisible]);

  const pillX = useRef(new RNAnimated.Value(0)).current;
  const pillW = useRef(new RNAnimated.Value(0)).current;
  const pillScale = useRef(new RNAnimated.Value(1)).current;

  // Use a record with route names as keys for reliable layout tracking
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const measuredCount = useRef(0);
  const [ready, setReady] = useState(false);

  const startX = useRef(0);
  const lastTargetIndex = useRef(-1);

  const tabPanGesture = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-12, 12])
    .failOffsetY([-8, 8])
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
    const expansionTranslateY = interpolate(
      translateY.value,
      [0, snapCollapsed.value],
      [150, 0],
      Extrapolate.CLAMP
    );
    const expansionOpacity = interpolate(
      translateY.value,
      [0, snapCollapsed.value * 0.5],
      [0, 1],
      Extrapolate.CLAMP
    );

    const routeTranslateY = interpolate(
      tabVisibility.value,
      [0, 1],
      [150, 0],
      Extrapolate.CLAMP
    );
    const routeOpacity = tabVisibility.value;

    return {
      transform: [
        {
          translateY: expansionTranslateY + routeTranslateY,
        },
      ],
      opacity: expansionOpacity * routeOpacity,
    };
  });


  return (
    <Animated.View style={[{ position: 'absolute', left: 0, right: 0, bottom: 0 }, tabContainerStyle]} pointerEvents={isTabBarVisible ? "auto" : "none"}>
      <GestureDetector gesture={tabPanGesture}>
        <View
          style={{
            position: 'absolute',
            bottom: TAB_BAR_BOTTOM,
            left: 24,
            right: 24,
            borderRadius: 999,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.35 : 0.15,
            shadowRadius: 10,
            elevation: 6,
          }}
        >
          <LinearGradient
            colors={isDark ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.08)'] : ['#FFFFFF', colors.border]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ borderRadius: 999, padding: 1.2, overflow: 'hidden' }}
          >
            <LinearGradient
              colors={isDark ? ['rgba(24, 24, 26, 0.82)', 'rgba(38, 38, 41, 0.82)'] : ['rgba(255, 255, 255, 0.4)', 'rgba(255, 255, 255, 0.75)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 8,
                paddingHorizontal: 8,
                overflow: 'hidden',
              }}
            >
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <BlurView
                  intensity={70}
                  tint={isDark ? "dark" : "light"}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Inner sliding active pill body component (clipped inside the overflow:hidden containers) */}
              <RNAnimated.View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: pillX,
                  width: pillW,
                  height: PILL_H,
                  borderRadius: PILL_H / 2,
                  transform: [
                    { scale: pillScale }
                  ]
                }}
              >
                {/* Pill Body Outer Bevel Rim */}
                <LinearGradient
                  colors={outerGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={{
                    width: '100%',
                    height: PILL_H,
                    borderRadius: PILL_H / 2,
                    padding: 1.0,
                  }}
                >
                  {/* Pill Body Inner Concave Gradient */}
                  <LinearGradient
                    colors={innerGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: (PILL_H - 2) / 2,
                    }}
                  />
                </LinearGradient>
              </RNAnimated.View>

          {state.routes.map((route, index) => {
            if (!VISIBLE_ROUTES.includes(route.name)) return null;

            const isFocused = state.index === index;

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

            const iconColor = isFocused ? colors.tabIconSelected : colors.tabIconDefault;

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
                {route.name === 'index' ? (
                  <Home size={20} color={iconColor} fill={iconColor} />
                ) : route.name === 'explore' ? (
                  <Search size={20} color={iconColor} fill={iconColor} />
                ) : route.name === 'profile' ? (
                  <ListMusic size={20} color={iconColor}/>
                ) : route.name === 'radio' ? (
                  <Podcast size={20} color={iconColor} />
                ) : null}
              </Pressable>
            );
          })}
            </LinearGradient>
          </LinearGradient>

          {/* Outer sliding ears component (unclipped because it sits outside overflow:hidden gradient containers, and rendered on top of the capsule) */}
          <RNAnimated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: pillX,
              width: pillW,
              height: PILL_H,
              borderRadius: PILL_H / 2,
              top: 8, // offset to align with the inner pill body inside the paddingVertical: 8 container
              zIndex: 3,
              transform: [
                { scale: pillScale }
              ]
            }}
          >
            {/* Left Ear */}
            <LinearGradient
              colors={earColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                position: 'absolute',
                top: -12,
                left: '18%',
                width: 10,
                height: 16,
                borderTopLeftRadius: 5,
                borderTopRightRadius: 5,
                borderWidth: 0.1,
                borderColor: 'rgba(255, 255, 255, 0.4)',
                transform: [{ rotate: '-15deg' }]
              }}
            />
            {/* Right Ear */}
            <LinearGradient
              colors={earColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                position: 'absolute',
                top: -12,
                right: '18%',
                width: 10,
                height: 16,
                borderTopLeftRadius: 5,
                borderTopRightRadius: 5,
                borderWidth: 0.1,
                borderColor: 'rgba(255, 255, 255, 0.4)',
                transform: [{ rotate: '15deg' }]
              }}
            />
          </RNAnimated.View>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}