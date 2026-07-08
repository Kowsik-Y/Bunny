import { Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Dimensions, Animated as RNAnimated, StyleSheet, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { getColors } from 'react-native-image-colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { upgradeThumbQuality } from '@/services/ytmusic/utils';

const AnimatedExpoImage = RNAnimated.createAnimatedComponent(ExpoImage);

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = width;

interface ArtistHeroProps {
  thumbnailUrl: string | undefined;
  name: string;
  subscribers: any;
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
  height = width,
}: ArtistHeroProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  const isSmallHeader = height < 150;
  const contentPaddingTop = isSmallHeader ? insets.top + 5 : insets.top + 44;
  const nameFontSize = isSmallHeader ? 22 : 44;
  const nameLineHeight = isSmallHeader ? 26 : 48;

  const [dominantHex, setDominantHex] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbnailUrl) return;
    let cancelled = false;

    const targetUrl = upgradeThumbQuality(thumbnailUrl);
    getColors(targetUrl, {
      cache: true,
      key: targetUrl,
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
      .catch(() => { });

    return () => { cancelled = true; };
  }, [thumbnailUrl, isDark]);

  // Build gradient stops from the palette color
  const base = dominantHex ?? (isDark ? '#0a0a14' : '#f0f0f0');
  const lum = luminance(base);

  // Text should be white when gradient base is dark, dark when gradient base is light
  const useWhiteText = isDark || lum < 0.55;
  const textColor = useWhiteText ? '#FFFFFF' : colors.text;
  const pillBg = useWhiteText ? 'rgba(0,0,0)' : 'rgba(0,0,0,0.12)';

  const resolvedSubscribers = typeof subscribers === 'string'
    ? subscribers
    : (subscribers && typeof subscribers === 'object'
      ? (subscribers.text || String(subscribers))
      : (subscribers ? String(subscribers) : undefined));

  return (
    <View style={[styles.heroContainer, { height }]}>
      {/* Blurred background backdrop to fill empty space on sides */}


      {/* Actual full image */}
      <AnimatedExpoImage
        source={{ uri: upgradeThumbQuality(thumbnailUrl) }}
        style={[
          styles.heroImage,
          {
            height: "100%",
            transform: [
              { scale: headerScale },
              {
                translateY: headerScale.interpolate({
                  inputRange: [1, 1.3],
                  outputRange: [0, height * 0.15],
                }),
              },
            ],
          },
        ]}
        contentFit="cover"
        contentPosition="top"
      />

      {/* Dynamic bottom gradient overlay so text is readable and it fades into content */}
      <LinearGradient
        colors={[
          withAlpha(colors.background, 0),
          withAlpha(colors.background, 0.45),
          withAlpha(colors.background, 0.85),
          colors.background,
        ]}
        style={StyleSheet.absoluteFill}
      />

      <RNAnimated.View style={[styles.heroContent, { opacity: headerOpacity, paddingTop: contentPaddingTop }]}>
        <View style={styles.heroMeta}>
          <Typography style={[
            styles.artistName,
            {
              fontSize: nameFontSize,
              lineHeight: nameLineHeight + 8,
              color: textColor,
            }
          ]}>{name}</Typography>
          {resolvedSubscribers && !isSmallHeader && (
            <View style={[styles.subPill, { backgroundColor: pillBg }]}>
              <Typography style={[styles.subPillText, { color: "#fff" }]}>{resolvedSubscribers}</Typography>
            </View>
          )}
        </View>
      </RNAnimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: "100%",
    overflow: 'hidden',
  },
  heroImage: {
    width: "100%",
    height: "100%",
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
    fontWeight: '900',
    letterSpacing: -1.0,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
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
