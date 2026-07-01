import React from 'react';
import {
  Pressable,
  PressableProps,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from './typography';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface ButtonProps extends PressableProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
  label?: string;
}

export function Button({
  variant = 'default',
  size = 'default',
  leftIcon,
  rightIcon,
  loading = false,
  label,
  children,
  style,
  disabled,
  ...props
}: ButtonProps) {
  const { colors, semiBoldFontFamily } = useAppTheme();

  const addAlpha = (color: string, opacity: number) => {
    if (!color) return 'rgba(0,0,0,0.1)';
    // Handle HSL format (modern space-separated or legacy comma-separated)
    if (color.startsWith('hsl')) {
      return color
        .replace('hsl', 'hsla')
        .replace(')', `, ${opacity})`)
        .replace(/ /g, ', '); // Convert space-separated to comma-separated for better compatibility
    }
    // Handle Hex format
    if (color.startsWith('#')) {
      const alpha = Math.round(opacity * 255)
        .toString(16)
        .padStart(2, '0');
      return color + alpha;
    }
    return color;
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'default':
        return {
          button: { backgroundColor: colors.primary },
          text: { color: colors.primaryForeground },
          ripple: addAlpha(colors.primaryForeground, 0.2),
        };
      case 'destructive':
        return {
          button: { backgroundColor: colors.destructive },
          text: { color: colors.destructiveForeground },
          ripple: addAlpha(colors.destructiveForeground, 0.2),
        };
      case 'outline':
        return {
          button: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: colors.border,
          },
          text: { color: colors.text },
          ripple: addAlpha(colors.primary, 0.1),
        };
      case 'secondary':
        return {
          button: { backgroundColor: colors.secondary },
          text: { color: colors.secondaryForeground },
          ripple: addAlpha(colors.secondaryForeground, 0.2),
        };
      case 'ghost':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: colors.text },
          ripple: addAlpha(colors.primary, 0.1),
        };
      case 'link':
        return {
          button: { backgroundColor: 'transparent', paddingHorizontal: 0 },
          text: {
            color: colors.primary,
            textDecorationLine: 'underline' as const,
          },
          ripple: 'transparent',
        };
      default:
        return {
          button: { backgroundColor: colors.primary },
          text: { color: colors.primaryForeground },
          ripple: addAlpha(colors.primaryForeground, 0.2),
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          button: { height: 36, paddingHorizontal: 12, borderRadius: 6 },
          text: { fontSize: 14 },
        };
      case 'lg':
        return {
          button: { height: 56, paddingHorizontal: 32, borderRadius: 8 },
          text: { fontSize: 18 },
        };
      case 'icon':
        return {
          button: { height: 40, width: 40, borderRadius: 20, paddingHorizontal: 0 },
          text: { fontSize: 16 },
        };
      default:
        return {
          button: { height: 48, paddingHorizontal: 24, borderRadius: 8 },
          text: { fontSize: 16 },
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <Pressable
      android_ripple={{
        color: variantStyles.ripple,
        borderless: false,
        foreground: true,
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.pressable,
        sizeStyles.button,
        pressed && Platform.OS === 'ios' && variant !== 'link' && { opacity: 0.7 },
      ]}
      {...props}
    >
      <View
        style={[
          styles.container,
          styles.content,
          variantStyles.button,
          sizeStyles.button,
          (disabled || loading) && { opacity: 0.5 },
          style as any,
        ]}
      >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={variantStyles.text.color}
              style={styles.icon}
            />
          ) : (
            <>
              {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
              {label ? (
                <Typography
                  style={[
                    variantStyles.text,
                    sizeStyles.text,
                    { fontFamily: semiBoldFontFamily, fontWeight: '600' },
                  ]}
                >
                  {label}
                </Typography>
              ) : (
                children
              )}
              {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
            </>
          )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
  icon: {
    marginRight: 0,
  },
});

