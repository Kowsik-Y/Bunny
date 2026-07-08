import { useEffect, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, Animated as RNAnimated, LayoutChangeEvent, Pressable, ScrollView } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Shuffle, Radio } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface ArtistActionButtonsProps {
  onShuffle: () => void;
  onMix: () => void;
}

export function ArtistActionButtons({ onShuffle, onMix }: ArtistActionButtonsProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.actionRow, { backgroundColor: colors.background }]}>
      <Button
        variant="default"
        onPress={onShuffle}
        style={styles.actionBtn}
        leftIcon={<Shuffle size={17} color={colors.primaryForeground} />}
        label="Shuffle"
      />

      <Button
        variant="secondary"
        onPress={onMix}
        style={styles.actionBtn}
        leftIcon={<Radio size={17} color={colors.secondaryForeground} />}
        label="Mix"
      />
    </View>
  );
}

interface ArtistTabBarProps {
  availableTabs: string[];
  activeTab: string;
  onTabChange: (tab: any) => void;
  containerStyle?: any;
}

export function ArtistTabBar({
  availableTabs,
  activeTab,
  onTabChange,
  containerStyle,
}: ArtistTabBarProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';

  const pillX = useRef(new RNAnimated.Value(0)).current;
  const pillW = useRef(new RNAnimated.Value(0)).current;
  const pillScale = useRef(new RNAnimated.Value(1)).current;

  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const measuredCount = useRef(0);
  const [ready, setReady] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  const startX = useRef(0);
  const lastTargetIndex = useRef(-1);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollOffsetRef = useRef(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const autoScrollRAF = useRef<number | null>(null);
  const autoScrollDirection = useRef<'left' | 'right' | null>(null);
  const autoScrollStartTime = useRef<number>(0);

  const stopAutoScroll = useCallback(() => {
    if (autoScrollRAF.current !== null) {
      cancelAnimationFrame(autoScrollRAF.current);
      autoScrollRAF.current = null;
    }
    autoScrollDirection.current = null;
  }, []);

  const startAutoScroll = useCallback((direction: 'left' | 'right') => {
    // If already scrolling in the same direction, keep going
    if (autoScrollDirection.current === direction) return;
    // Direction changed or starting fresh — cancel old loop first
    if (autoScrollRAF.current !== null) {
      cancelAnimationFrame(autoScrollRAF.current);
      autoScrollRAF.current = null;
    }
    autoScrollDirection.current = direction;
    autoScrollStartTime.current = performance.now();

    const step = (now: number) => {
      if (autoScrollDirection.current !== direction) return; // direction changed, stop
      // Accelerate: 8px → 28px over 600ms
      const elapsed = now - autoScrollStartTime.current;
      const speed = Math.min(8 + (elapsed / 600) * 20, 28);
      const delta = direction === 'right' ? speed : -speed;
      scrollOffsetRef.current = Math.max(0, scrollOffsetRef.current + delta);
      scrollViewRef.current?.scrollTo({ x: scrollOffsetRef.current, animated: false });
      autoScrollRAF.current = requestAnimationFrame(step);
    };
    autoScrollRAF.current = requestAnimationFrame(step);
  }, []);

  const tabKeysString = availableTabs.join(',');
  useEffect(() => {
    const allMeasured = availableTabs.length > 0 && availableTabs.every(tab => tabLayouts.current[tab] !== undefined);
    if (allMeasured) {
      setReady(true);
      setTimeout(() => {
        slideTo(activeTab, false);
      }, 0);
    } else {
      setReady(false);
    }
  }, [tabKeysString]);

  const slideTo = (tabName: string, animate = true) => {
    const layout = tabLayouts.current[tabName];
    if (!layout) return;

    if (!animate) {
      pillX.setValue(layout.x);
      pillW.setValue(layout.width);
      return;
    }

    setIsMoving(true);

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
    ]).start((finished) => {
      if (finished) {
        setIsMoving(false);
      }
    });
  };

  const onTabLayout = (tabName: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    
    const current = tabLayouts.current[tabName];
    if (current && current.x === x && current.width === width) return;

    tabLayouts.current[tabName] = { x, width };

    const allMeasured = availableTabs.length > 0 && availableTabs.every(tab => tabLayouts.current[tab] !== undefined);
    if (allMeasured) {
      if (!ready) setReady(true);
      setTimeout(() => {
        slideTo(activeTab, false);
      }, 0);
    }
  };

  useEffect(() => {
    if (ready) {
      slideTo(activeTab);
    }
  }, [activeTab, ready]);

  const tabPanGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .runOnJS(true)
    .onStart(() => {
      setIsMoving(true);
      const activeLayout = tabLayouts.current[activeTab];
      if (activeLayout) {
        startX.current = activeLayout.x;
      }
      lastTargetIndex.current = availableTabs.indexOf(activeTab);

      RNAnimated.timing(pillScale, {
        toValue: 1.1,
        duration: 160,
        useNativeDriver: false,
      }).start();

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    })
    .onUpdate((e) => {
      const layout = tabLayouts.current[activeTab];
      if (layout) {
        let nextX = startX.current + e.translationX;
        const firstTab = availableTabs[0];
        const lastTab = availableTabs[availableTabs.length - 1];
        const minLayout = tabLayouts.current[firstTab];
        const maxLayout = tabLayouts.current[lastTab];

        if (minLayout && maxLayout) {
          nextX = Math.max(minLayout.x, Math.min(maxLayout.x, nextX));
        }

        pillX.setValue(nextX);

        // Auto-scroll when dragging near the edges of the visible area
        const EDGE_ZONE = 50;
        const absoluteX = e.absoluteX;
        if (containerWidth > 0) {
          if (absoluteX < EDGE_ZONE) {
            startAutoScroll('left');
          } else if (absoluteX > containerWidth - EDGE_ZONE) {
            startAutoScroll('right');
          } else {
            stopAutoScroll();
          }
        }

        let closestIndex = lastTargetIndex.current;
        let minDiff = Infinity;
        availableTabs.forEach((tabName, idx) => {
          const tabLayout = tabLayouts.current[tabName];
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

          const targetTabName = availableTabs[closestIndex];
          const targetLayout = tabLayouts.current[targetTabName];
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
      stopAutoScroll();
      RNAnimated.spring(pillScale, {
        toValue: 1,
        useNativeDriver: false,
      }).start();

      const finalX = startX.current + e.translationX;
      let closestTab = activeTab;
      let minDiff = Infinity;

      Object.entries(tabLayouts.current).forEach(([tabName, layout]) => {
        if (!availableTabs.includes(tabName)) return;
        const diff = Math.abs(layout.x - finalX);
        if (diff < minDiff) {
          minDiff = diff;
          closestTab = tabName;
        }
      });

      if (closestTab !== activeTab) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onTabChange(closestTab);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const layout = tabLayouts.current[activeTab];
        if (layout) {
          RNAnimated.parallel([
            RNAnimated.spring(pillX, {
              toValue: layout.x,
              useNativeDriver: false,
            }),
            RNAnimated.spring(pillW, {
              toValue: layout.width,
              useNativeDriver: false,
            })
          ]).start(() => {
            setIsMoving(false);
          });
        } else {
          setIsMoving(false);
        }
      }
    });

  const outerGradient: [string, string] = isDark
    ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.08)']
    : ['#FFFFFF', colors.border];
  const innerGradient: [string, string] = isDark
    ? ['rgba(24, 24, 26, 0.82)', 'rgba(38, 38, 41, 0.82)']
    : ['rgba(255, 255, 255, 0.45)', 'rgba(255, 255, 255, 0.8)'];

  if (availableTabs.length === 0) return null;

  return (
    <View style={[styles.tabBarWrapper, { backgroundColor: colors.background }]}>
      <GestureDetector gesture={tabPanGesture}>
        <View
          style={[
            styles.capsuleContainer,
            {
              shadowColor: '#000',
              shadowOpacity: isDark ? 0.25 : 0.08,
            },
            containerStyle,
          ]}
        >
          <LinearGradient
            colors={outerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.capsuleOuter}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
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

              <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                bounces={false}
                scrollEventThrottle={16}
                onScroll={(e) => { scrollOffsetRef.current = e.nativeEvent.contentOffset.x; }}
                style={{ flexGrow: 0, flexShrink: 0 }}
                contentContainerStyle={{ flexGrow: 0, alignItems: 'center' }}
              >
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

                  {availableTabs.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <Pressable
                        key={tab}
                        onPress={() => onTabChange(tab)}
                        onLayout={(e) => onTabLayout(tab, e)}
                        style={styles.tabBtn}
                      >
                        <Typography
                          style={[
                            styles.tabLabel,
                            {
                              color: isActive
                                ? (isMoving ? colors.text : colors.primaryForeground)
                                : colors.mutedForeground,
                              fontWeight: isActive ? '700' : '600',
                            },
                          ]}
                        >
                          {tab}
                        </Typography>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </LinearGradient>
          </LinearGradient>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabBarWrapper: {
    paddingBottom: 8,
    paddingTop: 4,
    alignSelf: 'stretch',
  },
  capsuleContainer: {
    alignSelf: 'center',
    marginVertical: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
    height: 48,
  },
  capsuleOuter: {
    borderRadius: 24,
    padding: 1.2,
    overflow: 'hidden',
    height: 48,
  },
  capsuleInner: {
    borderRadius: 22.8,
    overflow: 'hidden',
    height: '100%',
    justifyContent: 'center',
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
    height: 38,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    paddingHorizontal: 16,
  },
  tabLabel: {
    fontSize: 13,
  },
});
