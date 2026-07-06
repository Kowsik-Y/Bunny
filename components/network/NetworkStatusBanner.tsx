import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useNetworkState } from '@/contexts/network-context';
import { useAppTheme } from '@/contexts/app-theme-context';

export function NetworkStatusBanner() {
  const { isConnected } = useNetworkState();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  
  // Track previous state to know when we transition from offline to online
  const [wasOffline, setWasOffline] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const translateY = useSharedValue(-100);

  useEffect(() => {
    if (isConnected === false) {
      setWasOffline(true);
      setShowSuccess(false);
      translateY.value = withSpring(insets.top > 0 ? insets.top : 20, {
        damping: 15,
        stiffness: 100,
      });
    } else if (isConnected === true && wasOffline) {
      setShowSuccess(true);
      // Stay visible for 3 seconds, then slide away
      translateY.value = withDelay(
        3000,
        withTiming(-100, { duration: 500, easing: Easing.out(Easing.ease) }, () => {
          runOnJS(setWasOffline)(false);
          runOnJS(setShowSuccess)(false);
        })
      );
    } else {
      translateY.value = withTiming(-100, { duration: 300 });
    }
  }, [isConnected, insets.top, wasOffline, translateY]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const isOffline = isConnected === false;
  
  // If we never went offline and are currently connected, don't render anything visible
  if (isConnected !== false && !showSuccess) {
    return null;
  }

  const bgColor = isOffline ? 'rgba(239, 68, 68, 0.95)' : 'rgba(16, 185, 129, 0.95)'; // Red for offline, Green for online
  const Icon = isOffline ? WifiOff : Wifi;
  const message = isOffline ? 'Offline Mode • Playing downloads' : 'Back Online';

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[styles.pill, { backgroundColor: bgColor }]}>
        <Icon color="#ffffff" size={16} strokeWidth={2.5} />
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  text: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
