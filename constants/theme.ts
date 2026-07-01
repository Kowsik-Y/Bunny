/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeFontName = 'sans' | 'serif' | 'rounded' | 'mono' | 'poppins' | 'nunito' | 'combo';
export type ThemeVariantName =
  | 'Neutral'
  | 'Stone'
  | 'Zinc'
  | 'Mauve'
  | 'Olive'
  | 'Mist'
  | 'Taupe';

export type ThemeColors = {
  text: string;
  background: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

export type ResolvedThemeMode = Exclude<ThemeMode, 'system'>;

export const ThemeVariants: Record<ThemeVariantName, Record<ResolvedThemeMode, ThemeColors>> = {
  Neutral: {
    light: {
      text: 'hsl(0 0% 3.9%)',
      background: 'hsl(0 0% 100%)',
      card: 'hsl(0 0% 100%)',
      cardForeground: 'hsl(0 0% 3.9%)',
      popover: 'hsl(0 0% 100%)',
      popoverForeground: 'hsl(0 0% 3.9%)',
      primary: 'hsl(0 0% 9%)',
      primaryForeground: 'hsl(0 0% 98%)',
      secondary: 'hsl(0 0% 96.1%)',
      secondaryForeground: 'hsl(0 0% 9%)',
      muted: 'hsl(0 0% 96.1%)',
      mutedForeground: ' hsl(0 0% 45.1%)',
      accent: 'hsl(0 0% 96.1%)',
      accentForeground: 'hsl(0 0% 9%)',
      destructive: 'hsl(0 84.2% 60.2%)',
      destructiveForeground: 'hsl(0 0% 98%)',
      border: 'hsl(0 0% 89.8%)',
      input: 'hsl(0 0% 89.8%)',
      ring: 'hsl(0 0% 3.9%)',
      tint: 'hsl(0 0% 3.9%)',
      icon: 'hsl(0 0% 3.9%)',
      tabIconDefault: 'hsl(0 0% 60.1%)',
      tabIconSelected: 'hsl(0 0% 3.9%)',
    },
    dark: {
      text: 'hsl(0 0% 98%)',
      background: 'hsl(0 0% 3.9%)',
      card: 'hsl(0 0% 3.9%)',
      cardForeground: 'hsl(0 0% 98%)',
      popover: 'hsl(0 0% 3.9%)',
      popoverForeground: 'hsl(0 0% 98%)',
      primary: 'hsl(0 0% 98%)',
      primaryForeground: 'hsl(0 0% 9%)',
      secondary: 'hsl(0 0% 14.9%)',
      secondaryForeground: 'hsl(0 0% 98%)',
      muted: 'hsl(0 0% 14.9%)',
      mutedForeground: 'hsl(0 0% 63.9%)',
      accent: 'hsl(0 0% 14.9%)',
      accentForeground: 'hsl(0 0% 98%)',
      destructive: 'hsl(0 62.8% 30.6%)',
      destructiveForeground: 'hsl(0 0% 98%)',
      border: 'hsl(0 0% 14.9%)',
      input: ' hsl(0 0% 14.9%)',
      ring: 'hsl(0 0% 83.1%)',
      tint: 'hsl(0 0% 98%)',
      icon: 'hsl(0 0% 98%)',
      tabIconDefault: 'hsl(0 0% 63.9%)',
      tabIconSelected: 'hsl(0 0% 98%)',
    },
  },
  Stone: {
    light: {
      text: '#1C1917',
      background: '#FAFAF9',
      card: '#FFFFFF',
      cardForeground: '#1C1917',
      popover: '#FFFFFF',
      popoverForeground: '#1C1917',
      primary: '#78716C',
      primaryForeground: '#FAFAF9',
      secondary: '#F5F5F4',
      secondaryForeground: '#292524',
      muted: '#F5F5F4',
      mutedForeground: '#78716C',
      accent: '#E7E5E4',
      accentForeground: '#292524',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      border: '#E7E5E4',
      input: '#E7E5E4',
      ring: '#A8A29E',
      tint: '#78716C',
      icon: '#78716C',
      tabIconDefault: '#A8A29E',
      tabIconSelected: '#57534E',
    },
    dark: {
      text: '#E7E5E4',
      background: '#0C0A09',
      card: '#1C1917',
      cardForeground: '#E7E5E4',
      popover: '#1C1917',
      popoverForeground: '#E7E5E4',
      primary: '#D6D3D1',
      primaryForeground: '#1C1917',
      secondary: '#292524',
      secondaryForeground: '#E7E5E4',
      muted: '#292524',
      mutedForeground: '#A8A29E',
      accent: '#3F3F46',
      accentForeground: '#E7E5E4',
      destructive: '#F87171',
      destructiveForeground: '#0C0A09',
      border: '#292524',
      input: '#3F3F46',
      ring: '#A8A29E',
      tint: '#D6D3D1',
      icon: '#A8A29E',
      tabIconDefault: '#A8A29E',
      tabIconSelected: '#E7E5E4',
    },
  },
  Zinc: {
    light: {
      text: '#18181B',
      background: '#FAFAFA',
      card: '#FFFFFF',
      cardForeground: '#18181B',
      popover: '#FFFFFF',
      popoverForeground: '#18181B',
      primary: '#71717A',
      primaryForeground: '#FAFAFA',
      secondary: '#F4F4F5',
      secondaryForeground: '#27272A',
      muted: '#F4F4F5',
      mutedForeground: '#71717A',
      accent: '#E4E4E7',
      accentForeground: '#27272A',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      border: '#E4E4E7',
      input: '#E4E4E7',
      ring: '#A1A1AA',
      tint: '#71717A',
      icon: '#71717A',
      tabIconDefault: '#A1A1AA',
      tabIconSelected: '#52525B',
    },
    dark: {
      text: '#E4E4E7',
      background: '#09090B',
      card: '#18181B',
      cardForeground: '#E4E4E7',
      popover: '#18181B',
      popoverForeground: '#E4E4E7',
      primary: '#D4D4D8',
      primaryForeground: '#18181B',
      secondary: '#27272A',
      secondaryForeground: '#E4E4E7',
      muted: '#27272A',
      mutedForeground: '#A1A1AA',
      accent: '#3F3F46',
      accentForeground: '#E4E4E7',
      destructive: '#F87171',
      destructiveForeground: '#09090B',
      border: '#27272A',
      input: '#3F3F46',
      ring: '#A1A1AA',
      tint: '#D4D4D8',
      icon: '#A1A1AA',
      tabIconDefault: '#A1A1AA',
      tabIconSelected: '#E4E4E7',
    },
  },
  Mauve: {
    light: {
      text: '#2E1F33',
      background: '#F6F2F7',
      card: '#FFFFFF',
      cardForeground: '#2E1F33',
      popover: '#FFFFFF',
      popoverForeground: '#2E1F33',
      primary: '#8B5FBF',
      primaryForeground: '#F6F2F7',
      secondary: '#F1E9F4',
      secondaryForeground: '#3A2A40',
      muted: '#F1E9F4',
      mutedForeground: '#7A5B91',
      accent: '#E6D7EE',
      accentForeground: '#3A2A40',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      border: '#E6D7EE',
      input: '#E6D7EE',
      ring: '#A08AAE',
      tint: '#8B5FBF',
      icon: '#7A5B91',
      tabIconDefault: '#A08AAE',
      tabIconSelected: '#6E48A6',
    },
    dark: {
      text: '#F0E7F5',
      background: '#1C1520',
      card: '#2A1F30',
      cardForeground: '#F0E7F5',
      popover: '#2A1F30',
      popoverForeground: '#F0E7F5',
      primary: '#C7A0E6',
      primaryForeground: '#2A1F30',
      secondary: '#33233A',
      secondaryForeground: '#F0E7F5',
      muted: '#33233A',
      mutedForeground: '#B69BC8',
      accent: '#4A3657',
      accentForeground: '#F0E7F5',
      destructive: '#F87171',
      destructiveForeground: '#1C1520',
      border: '#33233A',
      input: '#4A3657',
      ring: '#B69BC8',
      tint: '#C7A0E6',
      icon: '#B69BC8',
      tabIconDefault: '#B69BC8',
      tabIconSelected: '#F0E7F5',
    },
  },
  Olive: {
    light: {
      text: '#1C2216',
      background: '#F6F7F2',
      card: '#FFFFFF',
      cardForeground: '#1C2216',
      popover: '#FFFFFF',
      popoverForeground: '#1C2216',
      primary: '#6A7F3F',
      primaryForeground: '#F6F7F2',
      secondary: '#EEF1E5',
      secondaryForeground: '#2A341E',
      muted: '#EEF1E5',
      mutedForeground: '#7D8B63',
      accent: '#DDE6C9',
      accentForeground: '#2A341E',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      border: '#DDE6C9',
      input: '#DDE6C9',
      ring: '#99A27A',
      tint: '#6A7F3F',
      icon: '#6A7F3F',
      tabIconDefault: '#99A27A',
      tabIconSelected: '#556332',
    },
    dark: {
      text: '#E6ECD9',
      background: '#1A1F14',
      card: '#242C1C',
      cardForeground: '#E6ECD9',
      popover: '#242C1C',
      popoverForeground: '#E6ECD9',
      primary: '#AFC286',
      primaryForeground: '#242C1C',
      secondary: '#2D3723',
      secondaryForeground: '#E6ECD9',
      muted: '#2D3723',
      mutedForeground: '#9CAF78',
      accent: '#3B4A2D',
      accentForeground: '#E6ECD9',
      destructive: '#F87171',
      destructiveForeground: '#1A1F14',
      border: '#2D3723',
      input: '#3B4A2D',
      ring: '#9CAF78',
      tint: '#AFC286',
      icon: '#9CAF78',
      tabIconDefault: '#9CAF78',
      tabIconSelected: '#E6ECD9',
    },
  },
  Mist: {
    light: {
      text: '#0F1C22',
      background: '#F2F7F9',
      card: '#FFFFFF',
      cardForeground: '#0F1C22',
      popover: '#FFFFFF',
      popoverForeground: '#0F1C22',
      primary: '#5B7C8A',
      primaryForeground: '#F2F7F9',
      secondary: '#E6F0F4',
      secondaryForeground: '#1F2D33',
      muted: '#E6F0F4',
      mutedForeground: '#6B8792',
      accent: '#D3E3EA',
      accentForeground: '#1F2D33',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      border: '#D3E3EA',
      input: '#D3E3EA',
      ring: '#89A2AD',
      tint: '#5B7C8A',
      icon: '#5B7C8A',
      tabIconDefault: '#89A2AD',
      tabIconSelected: '#46626D',
    },
    dark: {
      text: '#D7E4EA',
      background: '#0F1B20',
      card: '#17262C',
      cardForeground: '#D7E4EA',
      popover: '#17262C',
      popoverForeground: '#D7E4EA',
      primary: '#9DB7C3',
      primaryForeground: '#17262C',
      secondary: '#22343B',
      secondaryForeground: '#D7E4EA',
      muted: '#22343B',
      mutedForeground: '#89A2AD',
      accent: '#2C424B',
      accentForeground: '#D7E4EA',
      destructive: '#F87171',
      destructiveForeground: '#0F1B20',
      border: '#22343B',
      input: '#2C424B',
      ring: '#89A2AD',
      tint: '#9DB7C3',
      icon: '#89A2AD',
      tabIconDefault: '#89A2AD',
      tabIconSelected: '#D7E4EA',
    },
  },
  Taupe: {
    light: {
      text: '#201912',
      background: '#F7F3EF',
      card: '#FFFFFF',
      cardForeground: '#201912',
      popover: '#FFFFFF',
      popoverForeground: '#201912',
      primary: '#8A6F5A',
      primaryForeground: '#F7F3EF',
      secondary: '#EFE7E1',
      secondaryForeground: '#2C221A',
      muted: '#EFE7E1',
      mutedForeground: '#8A6F5A',
      accent: '#E0D2C7',
      accentForeground: '#2C221A',
      destructive: '#DC2626',
      destructiveForeground: '#FFFFFF',
      border: '#E0D2C7',
      input: '#E0D2C7',
      ring: '#B19988',
      tint: '#8A6F5A',
      icon: '#8A6F5A',
      tabIconDefault: '#B19988',
      tabIconSelected: '#705744',
    },
    dark: {
      text: '#EFE7DF',
      background: '#1F1914',
      card: '#2A221B',
      cardForeground: '#EFE7DF',
      popover: '#2A221B',
      popoverForeground: '#EFE7DF',
      primary: '#CBB4A4',
      primaryForeground: '#2A221B',
      secondary: '#342A22',
      secondaryForeground: '#EFE7DF',
      muted: '#342A22',
      mutedForeground: '#B19988',
      accent: '#46392F',
      accentForeground: '#EFE7DF',
      destructive: '#F87171',
      destructiveForeground: '#1F1914',
      border: '#342A22',
      input: '#46392F',
      ring: '#B19988',
      tint: '#CBB4A4',
      icon: '#B19988',
      tabIconDefault: '#B19988',
      tabIconSelected: '#EFE7DF',
    },
  },
};

export const ThemeVariantOptions = Object.keys(ThemeVariants) as ThemeVariantName[];

export function getThemeColors(variant: ThemeVariantName, mode: ResolvedThemeMode) {
  return ThemeVariants[variant][mode];
}

export function getFontFamilies(font: ThemeFontName) {
  switch (font) {
    case 'poppins':
      return {
        body: 'Poppins_400Regular',
        heading: 'Poppins_700Bold',
        semiBold: 'Poppins_600SemiBold',
      };
    case 'nunito':
      return {
        body: 'Nunito_400Regular',
        heading: 'Nunito_700Bold',
        semiBold: 'Nunito_600SemiBold',
      };
    case 'combo':
      return {
        body: 'Nunito_400Regular',
        heading: 'Poppins_600SemiBold',
        semiBold: 'Nunito_600SemiBold',
      };
    default:
      return {
        body: Fonts[font],
        heading: Fonts[font],
        semiBold: Fonts[font],
      };
  }
}

export const Colors = ThemeVariants.Neutral;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export function addAlpha(color: string, alpha: number): string {
  if (!color) return 'transparent';

  const clean = color.trim();

  // If HSL format: 'hsl(0 0% 9%)' or 'hsl(0, 0%, 9%)'
  if (clean.startsWith('hsl')) {
    if (clean.endsWith(')')) {
      const inner = clean.substring(clean.startsWith('hsla') ? 5 : 4, clean.length - 1);
      const pureInner = inner.split('/')[0].trim();
      if (pureInner.includes(',')) {
        const parts = pureInner.split(',');
        return `hsla(${parts[0].trim()}, ${parts[1].trim()}, ${parts[2].trim()}, ${alpha})`;
      } else {
        const parts = pureInner.split(/\s+/);
        if (parts.length >= 3) {
          return `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
        }
      }
    }
  }

  // If HEX format: '#ffffff' or '#fff'
  if (clean.startsWith('#')) {
    const hex = clean.replace('#', '');
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  return color;
}
