import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewProps } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';

interface ProgressProps extends ViewProps {
  value?: number; // 0 to 100
  max?: number;
}

export function Progress({
  value = 0,
  max = 100,
  style,
  ...props
}: ProgressProps) {
  const { colors } = useAppTheme();
  const progressAnim = useRef(new Animated.Value(value)).current;

  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: value,
      useNativeDriver: false,
    }).start();
  }, [value, progressAnim]);

  const width = progressAnim.interpolate({
    inputRange: [0, max],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.secondary },
        style,
      ]}
      {...props}
    >
      <Animated.View
        style={[
          styles.bar,
          {
            backgroundColor: colors.primary,
            width,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 8,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
});
