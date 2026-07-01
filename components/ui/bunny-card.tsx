import React from 'react';
import { StyleSheet, View, ViewProps, Pressable, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/app-theme-context';

interface BunnyCardProps extends ViewProps {
  tintColor?: string;
  onPress?: () => void;
  glass?: boolean;
  elevated?: boolean;
  contentContainerStyle?: ViewProps['style'];
}

export function BunnyCard({
  children,
  style,
  tintColor,
  onPress,
  glass = true,
  elevated = true,
  contentContainerStyle,
  ...props
}: BunnyCardProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const ContentWrapper = onPress ? Pressable : View;

  const cardBg = tintColor
    ? (isDark ? `${tintColor}20` : `${tintColor}10`)
    : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)');

  return (
    <ContentWrapper
      onPress={onPress}
      android_ripple={{
        foreground: true,
        color: cardBg,
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: tintColor ? `${tintColor}50` : colors.border,
        },
        style
      ]}
      {...props}
    >
      {glass && (
        <BlurView
          intensity={isDark ? 30 : 65}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, { backgroundColor: cardBg }]}
        />
      )}
      <View style={[styles.innerContent, contentContainerStyle]}>
        {children}
      </View>
    </ContentWrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  innerContent: {
    padding: 20,
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
      }
    }),
  },
});
