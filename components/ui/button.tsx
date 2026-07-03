import React from 'react';
import {
  Pressable,
  PressableProps,
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha as themeAddAlpha } from '@/constants/theme';
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
  const { colors, colorScheme, semiBoldFontFamily } = useAppTheme();
  const isDark = colorScheme === 'dark';

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

  // ---------------------------------------------------------------------------
  // Theme-aware bevel gradient colours
  // Mirroring the bottom nav pill: outer rim = highlight→shadow, inner = mid→light
  // For flat/transparent variants (ghost, link, outline) we skip the bevel and
  // render a plain tinted fill so the button still looks intentional.
  // ---------------------------------------------------------------------------
  const getBevelColors = (): {
    // Semi-transparent overlays painted ON TOP of the button's base color (variantStyles.button).
    // The outer layer provides the 1px rim highlight/shadow, the inner provides the concave sheen.
    // Both are absoluteFill overlays so they never override the base theme color.
    rim: [string, string];    // outer 1-px gradient rim
    concave: [string, string]; // inner surface sheen
    useBevel: boolean;
  } => {
    const base = variantStyles.button.backgroundColor ?? 'transparent';
    const isTransparent = base === 'transparent';

    if (isTransparent) {
      return { rim: ['transparent', 'transparent'], concave: ['transparent', 'transparent'], useBevel: false };
    }

    if (isDark) {
      // Dark mode: bright top rim fading out, slight inner concave darkening at top
      return {
        rim:    ['rgba(255,255,255,0.25)', 'rgba(0,0,0,0.18)'],
        concave:['rgba(0,0,0,0.12)',       'rgba(255,255,255,0.07)'],
        useBevel: true,
      };
    } else {
      // Light mode: white top rim, soft shadow bottom, concave grey-to-white sheen
      return {
        rim:    ['rgba(255,255,255,0.85)', 'rgba(0,0,0,0.10)'],
        concave:['rgba(0,0,0,0.06)',       'rgba(255,255,255,0.65)'],
        useBevel: true,
      };
    }
  };

  const bevel = getBevelColors();
  const btnRadius = (sizeStyles.button as any).borderRadius ?? 8;
  const innerBorderRadius = btnRadius > 1 ? btnRadius - 1 : btnRadius;

  const innerContent = (
    <View style={[styles.content]}>
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
  );

  return (
    <Pressable
      android_ripple={{
        color: variantStyles.ripple,
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
      {bevel.useBevel ? (
        /*
         * Bevel structure:
         *   [Wrapper View]  ← holds the button's real theme color as backgroundColor
         *     [Rim gradient] absoluteFill — 1px outer highlight/shadow overlay
         *     [Concave gradient] absoluteFill with 1px inset — inner surface sheen overlay
         *     [Content] — on top of both overlay layers
         */
        <View
          style={[
            styles.bevelWrapper,
            variantStyles.button,
            sizeStyles.button,
            (disabled || loading) && { opacity: 0.5 },
            style as any,
          ]}
        >
          {/* Rim: full-bleed gradient overlay for the 1px edge highlight */}
          <LinearGradient
            colors={bevel.rim}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: btnRadius }]}
          />
          {/* Concave: inset by 1px so the rim peeks around the edge */}
          <LinearGradient
            colors={bevel.concave}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={[StyleSheet.absoluteFill, { margin: 1, borderRadius: innerBorderRadius }]}
          />
          {innerContent}
        </View>
      ) : (
        /* Flat fill for transparent variants (ghost / link / outline) */
        <View
          style={[
            styles.flatContainer,
            variantStyles.button,
            sizeStyles.button,
            (disabled || loading) && { opacity: 0.5 },
            style as any,
          ]}
        >
          {innerContent}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  bevelWrapper: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  flatContainer: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  content: {
    flex: 1,
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

