import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from './typography';
import { Info, AlertCircle, CircleCheck } from 'lucide-react-native';

type ToastType = 'default' | 'success' | 'error' | 'info';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { id, ...options };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast }: { toast: Toast; onDismiss: () => void }) {
  const { colors, colorScheme, semiBoldFontFamily } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const progress = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 14,
      }),
    ]).start();

    Animated.timing(progress, {
      toValue: 0,
      duration: 2750,
      useNativeDriver: false,
    }).start();
  }, []);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CircleCheck size={18} color={colors.primary} />;
      case 'error':
        return <AlertCircle size={18} color={colors.destructive} />;
      case 'info':
        return <Info size={18} color={colors.primary} />;
      default:
        return <Info size={18} color={colors.primary} />;
    }
  };

  const getProgressColor = () => {
    switch (toast.type) {
      case 'success':
        return colors.primary;
      case 'error':
        return colors.destructive;
      default:
        return colors.primary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: isDark ? 'rgba(30, 30, 35, 0.75)' : 'rgba(255, 255, 255, 0.75)',
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
          overflow: 'hidden',
        },
      ]}
    >
      {/* Glassmorphic Blur View */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BlurView
          intensity={isDark ? 30 : 65}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.toastContent}>
        <View style={styles.iconContainer}>{getIcon()}</View>
        <View style={styles.content}>
          {toast.title && (
            <Typography
              style={{
                fontFamily: semiBoldFontFamily,
                fontWeight: '600',
                fontSize: 14,
                color: colors.text,
              }}
            >
              {toast.title}
            </Typography>
          )}
          {toast.description && (
            <Typography
              variant="small"
              style={{ color: colors.mutedForeground, marginTop: 2, fontSize: 12 }}
            >
              {toast.description}
            </Typography>
          )}
        </View>
      </View>

      {/* Progress countdown indication bar */}
      <Animated.View
        style={[
          styles.progressBar,
          {
            backgroundColor: getProgressColor(),
            width: progress.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </Animated.View>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    zIndex: 9999,
  },
  toast: {
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    width: '100%',
  },
  toastContent: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
});
