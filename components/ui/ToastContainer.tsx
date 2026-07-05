import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Animated, DeviceEventEmitter } from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { TOAST_EVENT, type ToastPayload } from '@/services/toast';

export function ToastContainer() {
  const [currentToast, setCurrentToast] = useState<ToastPayload | null>(null);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(-40));
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
          {(() => {
            switch (currentToast.type) {
              case 'success':
                return <CheckCircle2 size={18} color="#34C759" style={styles.icon} />;
              case 'error':
                return <AlertCircle size={18} color="#FF3B30" style={styles.icon} />;
              case 'warning':
                return <AlertTriangle size={18} color="#FFCC00" style={styles.icon} />;
              default:
                return <Info size={18} color="#007AFF" style={styles.icon} />;
            }
          })()}
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
