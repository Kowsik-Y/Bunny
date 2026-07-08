import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  StyleSheet,
  Animated,
} from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from './typography';

interface SwitchProps extends TouchableOpacityProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  style,
  ...props
}: SwitchProps) {
  const { colors, colorScheme, semiBoldFontFamily } = useAppTheme();
  const translateX = useRef(new Animated.Value(checked ? 20 : 2)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: checked ? 20 : 2,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [checked, translateX]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onCheckedChange?.(!checked)}
      style={[styles.container, style]}
      {...props}
    >
      <View
        style={[
          styles.track,
          {
            backgroundColor: checked
              ? colors.primary
              : colorScheme === 'dark'
              ? 'rgba(255, 255, 255, 0.2)'
              : 'rgba(0, 0, 0, 0.12)',
          },
          disabled && { opacity: 0.5 },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: colors.background,
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
      {label && (
        <Typography
          style={[
            styles.label,
            { fontFamily: semiBoldFontFamily, color: colors.text },
            disabled && { opacity: 0.5 },
          ]}
        >
          {label}
        </Typography>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    marginLeft: 12,
    fontSize: 16,
  },
});
