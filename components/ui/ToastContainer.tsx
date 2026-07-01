import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, DeviceEventEmitter } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { TOAST_EVENT, type ToastPayload } from '@/services/toast';

export function ToastContainer() {
  const [currentToast, setCurrentToast] = useState<ToastPayload | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-40)).current;
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TOAST_EVENT, (payload: ToastPayload) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setCurrentToast(payload);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: -30,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setCurrentToast(null);
        });
      }, payload.duration || 3000);
    });

    return () => {
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!currentToast) return null;

  const getIconDetails = () => {
    switch (currentToast.type) {
      case 'success':
        return { name: 'check-circle' as const, color: '#34C759' };
      case 'error':
        return { name: 'alert-circle' as const, color: '#FF3B30' };
      case 'warning':
        return { name: 'alert-triangle' as const, color: '#FFCC00' };
      default:
        return { name: 'info' as const, color: '#007AFF' };
    }
  };

  const { name: iconName, color: iconColor } = getIconDetails();

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 10000 }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.content}>
          <Feather name={iconName} size={18} color={iconColor} style={styles.icon} />
          <Text style={styles.text} numberOfLines={2}>
            {currentToast.message}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    marginRight: 12,
  },
  text: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
  },
});
