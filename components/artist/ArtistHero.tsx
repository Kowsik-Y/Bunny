import { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions, Animated as RNAnimated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from '@/components/ui/typography';
import { getColors } from 'react-native-image-colors';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

interface ArtistHeroProps {
  thumbnailUrl: string | undefined;
  name: string;
  subscribers: string | undefined;
  headerScale?: any;
  headerOpacity?: any;
  height?: number;
}

/** Hex → RGB components */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return null;
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/** Build an rgba() string with given opacity */
function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/** Perceived luminance (0–1) */
function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
}

export function ArtistHero({
  thumbnailUrl,
  name,
  subscribers,
  headerScale = 1,
  headerOpacity = 1,
  height = 300,
}: ArtistHeroProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const isSmallHeader = height < 150;
  const contentPaddingTop = isSmallHeader ? insets.top + 5 : insets.top + 44;
  const nameFontSize = isSmallHeader ? 22 : 32;
  const nameLineHeight = isSmallHeader ? 26 : 36;

  const [dominantHex, setDominantHex] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbnailUrl) return;
    let cancelled = false;

    getColors(thumbnailUrl, {
      cache: true,
      key: thumbnailUrl,
      fallback: isDark ? '#0a0a14' : '#f5f5f5',
      quality: 'low',
    })
      .then((result) => {
        if (cancelled) return;
        let picked: string | undefined;
        if (result.platform === 'android') {
          picked = result.vibrant ?? result.dominant ?? result.average;
        } else if (result.platform === 'ios') {
          picked = result.primary ?? result.secondary ?? result.background;
        } else {
          picked = (result as any).vibrant ?? (result as any).dominant;
        }
        if (picked) setDominantHex(picked);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [thumbnailUrl, isDark]);

  // Build gradient stops from the palette color
  const base = dominantHex ?? (isDark ? '#0a0a14' : '#f0f0f0');
  const lum = luminance(base);

  // For dark mode: rich saturated color fading into the dark screen
  // For light mode: rich saturated color fading into the light screen
  // Final stop is always the solid screen background so there's no sharp clip edge
  const gradientColors: [string, string, string, string, string] = isDark
    ? [
        'transparent',
        withAlpha(base, 0.22),
        withAlpha(base, 0.62),
        withAlpha(base, 0.90),
        colors.background,
      ]
    : [
        'transparent',
        withAlpha(base, 0.14),
        withAlpha(base, 0.44),
        withAlpha(base, 0.78),
        colors.background,
      ];

  const gradientLocations: [number, number, number, number, number] = [0.01, 0.1, 0.5, 0.87, 1];

  // Text should be white when gradient base is dark, dark when gradient base is light
  const useWhiteText = isDark || lum < 0.55;
  const textColor = useWhiteText ? '#fff' : colors.text;
  const textShadowColor = useWhiteText ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.5)';
  const pillBg = useWhiteText ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';

  return (
    <View style={[styles.heroContainer, { height }]}>
      <RNAnimated.Image
        source={{ uri: thumbnailUrl }}
        style={[styles.heroImage, { height, transform: [{ scale: headerScale }] }]}
        resizeMode="cover"
      />
      <LinearGradient
        colors={gradientColors}
        locations={gradientLocations}
        style={StyleSheet.absoluteFill}
      />
      <RNAnimated.View style={[styles.heroContent, { opacity: headerOpacity, paddingTop: contentPaddingTop }]}>
        <View style={styles.heroMeta}>
          <Typography style={[
            styles.artistName,
            {
              fontSize: nameFontSize,
              lineHeight: nameLineHeight,
              color: textColor,
              textShadowColor,
            }
          ]}>{name}</Typography>
          {subscribers && !isSmallHeader && (
            <View style={[styles.subPill, { backgroundColor: pillBg }]}>
              <Typography style={[styles.subPillText, { color: textColor }]}>{subscribers}</Typography>
            </View>
          )}
        </View>
      </RNAnimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  heroImage: {
    width,
    height: HEADER_HEIGHT,
  },
  heroContent: {
    ...StyleSheet.absoluteFill,
    paddingHorizontal: 20,
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  heroMeta: {
    gap: 8,
  },
  artistName: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subPill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  subPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
