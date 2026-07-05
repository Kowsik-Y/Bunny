import { useAppTheme } from '@/contexts/app-theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  PressableProps,
  StyleSheet,
  View,
  Text
} from 'react-native';
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
        rim: ['rgba(255,255,255,0.25)', 'rgba(0,0,0,0.18)'],
        concave: ['rgba(0,0,0,0.12)', 'rgba(255,255,255,0.07)'],
        useBevel: true,
      };
    } else {
      // Light mode: balanced bevel — visible rim highlight + concave sheen without washing out base color
      return {
        rim: ['rgba(255,255,255,0.22)', 'rgba(0,0,0,0.15)'],
        concave: ['rgba(0,0,0,0.10)', 'rgba(255,255,255,0.12)'],
        useBevel: true,
      };
    }
  };

  const bevel = getBevelColors();
  // Resolve the effective borderRadius: style prop overrides size preset
  const styleRadius = style && typeof style === 'object' && !Array.isArray(style)
    ? (style as any).borderRadius
    : undefined;
  const btnRadius = styleRadius ?? (sizeStyles.button as any).borderRadius ?? 8;
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

  // The outer View is the true clip boundary for the Android ripple.
  // Pressable's own overflow:hidden does NOT reliably clip ripples on Android.
  // IMPORTANT: do NOT put sizeStyles.button here — padding/height belong only on
  // the inner bevelWrapper/flatContainer, otherwise they get doubled.
  // Split style into outer layout styles and inner styles
  const outerStyle: any[] = [
    styles.rippleClip,
    { borderRadius: btnRadius },
  ];
  const innerStyle: any[] = [];

  if (style && typeof style === 'object') {
    const flattened = StyleSheet.flatten(style);
    const layoutProps = [
      'flex', 'flexGrow', 'flexShrink', 'flexBasis',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
      'position', 'top', 'bottom', 'left', 'right', 'alignSelf',
    ];
    
    const outer: any = {};
    const inner: any = {};
    
    for (const key of Object.keys(flattened)) {
      if (layoutProps.includes(key)) {
        outer[key] = (flattened as any)[key];
      } else {
        inner[key] = (flattened as any)[key];
      }
    }
    
    if (flattened.height !== undefined) {
      inner.height = '100%';
    }
    if (flattened.width !== undefined || flattened.flex !== undefined) {
      inner.width = '100%';
    }
    
    outerStyle.push(outer);
    innerStyle.push(inner);
  } else {
    innerStyle.push(style);
  }

  return (
    <View style={outerStyle}>
      <Pressable
        android_ripple={{
          color: variantStyles.ripple,
          foreground: true,
          borderless: false,
        }}
        disabled={disabled || loading}
        style={({ pressed }) => [
          styles.pressable,
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
              ...innerStyle,
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
              ...innerStyle,
            ]}
          >
            {innerContent}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outer View: the REAL clip boundary for Android ripple.
  // overflow:hidden on Pressable does NOT clip ripples reliably on Android.
  rippleClip: {
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  // Pressable fills the clip container entirely.
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  bevelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  flatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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

