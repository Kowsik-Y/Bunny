import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated as RNAnimated, LayoutChangeEvent, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from '@/components/ui/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
  badge?: string | number;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
  style?: any;
}

export function SegmentedControl<T extends string>({
  options,
  selectedValue,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';

  const pillX = useRef(new RNAnimated.Value(0)).current;
  const pillW = useRef(new RNAnimated.Value(0)).current;
  const pillScale = useRef(new RNAnimated.Value(1)).current;

  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const measuredCount = useRef(0);
  const [ready, setReady] = useState(false);

  const startX = useRef(0);
  const lastTargetIndex = useRef(-1);

  const optionValues = options.map((opt) => opt.value);
  const optionsString = optionValues.join(',');

  useEffect(() => {
    tabLayouts.current = {};
    measuredCount.current = 0;
    setReady(false);
  }, [optionsString]);

  const slideTo = (val: T, animate = true) => {
    const layout = tabLayouts.current[val];
    if (!layout) return;

    if (!animate) {
      pillX.setValue(layout.x);
      pillW.setValue(layout.width);
      return;
    }

    RNAnimated.parallel([
      RNAnimated.spring(pillX, {
        toValue: layout.x,
        useNativeDriver: false,
        damping: 18,
        stiffness: 150,
      }),
      RNAnimated.spring(pillW, {
        toValue: layout.width,
        useNativeDriver: false,
        damping: 18,
        stiffness: 150,
      }),
    ]).start();
  };

  const onTabLayout = (val: T, e: LayoutChangeEvent) => {
    if (tabLayouts.current[val]) return;

    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[val] = { x, width };
    measuredCount.current += 1;

    if (measuredCount.current === options.length) {
      setReady(true);
      setTimeout(() => {
        slideTo(selectedValue, false);
      }, 0);
    }
  };

  useEffect(() => {
    if (ready) {
      slideTo(selectedValue);
    }
  }, [selectedValue, ready]);

  const tabPanGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      const activeLayout = tabLayouts.current[selectedValue];
      if (activeLayout) {
        startX.current = activeLayout.x;
      }
      lastTargetIndex.current = optionValues.indexOf(selectedValue);

      RNAnimated.timing(pillScale, {
        toValue: 1.1,
        duration: 160,
        useNativeDriver: false,
      }).start();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    })
    .onUpdate((e) => {
      const layout = tabLayouts.current[selectedValue];
      if (layout) {
        let nextX = startX.current + e.translationX;
        const firstVal = optionValues[0];
        const lastVal = optionValues[optionValues.length - 1];
        const minLayout = tabLayouts.current[firstVal];
        const maxLayout = tabLayouts.current[lastVal];

        if (minLayout && maxLayout) {
          nextX = Math.max(minLayout.x, Math.min(maxLayout.x, nextX));
        }

        pillX.setValue(nextX);

        let closestIndex = lastTargetIndex.current;
        let minDiff = Infinity;
        optionValues.forEach((val, idx) => {
          const tabLayout = tabLayouts.current[val];
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
          Haptics.selectionAsync().catch(() => {});

          const targetVal = optionValues[closestIndex];
          const targetLayout = tabLayouts.current[targetVal];
          if (targetLayout) {
            RNAnimated.spring(pillW, {
              toValue: targetLayout.width,
              useNativeDriver: false,
              damping: 18,
              stiffness: 150,
            }).start();
          }
        }
      }
    })
    .onEnd((e) => {
      RNAnimated.spring(pillScale, {
        toValue: 1,
        useNativeDriver: false,
      }).start();

      const finalX = startX.current + e.translationX;
      let closestVal = selectedValue;
      let minDiff = Infinity;

      Object.entries(tabLayouts.current).forEach(([val, layout]) => {
        if (!optionValues.includes(val as T)) return;
        const diff = Math.abs(layout.x - finalX);
        if (diff < minDiff) {
          minDiff = diff;
          closestVal = val as T;
        }
      });

      if (closestVal !== selectedValue) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onChange(closestVal);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const layout = tabLayouts.current[selectedValue];
        if (layout) {
          RNAnimated.spring(pillX, {
            toValue: layout.x,
            useNativeDriver: false,
          }).start();
          RNAnimated.spring(pillW, {
            toValue: layout.width,
            useNativeDriver: false,
          }).start();
        }
      }
    });

  const outerGradient: [string, string] = isDark
    ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.08)']
    : ['#FFFFFF', colors.border];
  const innerGradient: [string, string] = isDark
    ? ['rgba(24, 24, 26, 0.82)', 'rgba(38, 38, 41, 0.82)']
    : ['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.8)'];

  if (options.length === 0) return null;

  return (
    <View style={[styles.tabBarWrapper, { backgroundColor: colors.background }, style]}>
      <GestureDetector gesture={tabPanGesture}>
        <View
          style={[
            styles.capsuleContainer,
            {
              shadowColor: '#000',
              shadowOpacity: isDark ? 0.25 : 0.08,
            },
          ]}
        >
          <LinearGradient
            colors={outerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.capsuleOuter}
          >
            <LinearGradient
              colors={innerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.capsuleInner}
            >
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <BlurView
                  intensity={isDark ? 30 : 65}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              <View style={styles.tabsContainer}>
                {ready && (
                  <RNAnimated.View
                    pointerEvents="none"
                    style={[
                      styles.slidingPill,
                      {
                        left: pillX,
                        width: pillW,
                        transform: [{ scale: pillScale }],
                      },
                    ]}
                  >
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary, borderRadius: 20 }]} />
                    <LinearGradient
                      colors={isDark ? ['rgba(255,255,255,0.25)', 'rgba(0,0,0,0.18)'] : ['rgba(255,255,255,0.22)', 'rgba(0,0,0,0.15)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                    />
                    <LinearGradient
                      colors={isDark ? ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.07)'] : ['rgba(0,0,0,0.10)', 'rgba(255,255,255,0.12)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={[StyleSheet.absoluteFill, { margin: 1, borderRadius: 19 }]}
                    />
                  </RNAnimated.View>
                )}

                {options.map((opt) => {
                  const isActive = selectedValue === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => onChange(opt.value)}
                      onLayout={(e) => onTabLayout(opt.value, e)}
                      style={styles.tabBtn}
                    >
                      <Typography
                        style={[
                          styles.tabLabel,
                          {
                            color: isActive ? colors.primaryForeground : colors.mutedForeground,
                            fontWeight: isActive ? '700' : '600',
                          },
                        ]}
                      >
                        {opt.label}
                        {opt.badge !== undefined && ` (${opt.badge})`}
                      </Typography>
                    </Pressable>
                  );
                })}
              </View>
            </LinearGradient>
          </LinearGradient>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    paddingBottom: 8,
  },
  capsuleContainer: {
    marginHorizontal: 16,
    marginVertical: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  capsuleOuter: {
    borderRadius: 24,
    padding: 1.2,
    overflow: 'hidden',
  },
  capsuleInner: {
    borderRadius: 22.8,
    overflow: 'hidden',
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    position: 'relative',
  },
  slidingPill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 20,
  },
  tabBtn: {
    flex: 1,
    height: 38,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 13,
  },
});
