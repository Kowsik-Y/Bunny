import React from 'react';
import { StyleSheet, View, Pressable, Dimensions, Animated as RNAnimated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/contexts/app-theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Typography } from '@/components/ui/typography';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

interface ArtistHeroProps {
  thumbnailUrl: string | undefined;
  name: string;
  subscribers: string | undefined;
  headerScale: any;
  headerOpacity: any;
  onBackPress: () => void;
}

export function ArtistHero({
  thumbnailUrl,
  name,
  subscribers,
  headerScale,
  headerOpacity,
  onBackPress,
}: ArtistHeroProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.heroContainer}>
      <RNAnimated.Image
        source={{ uri: thumbnailUrl }}
        style={[styles.heroImage, { transform: [{ scale: headerScale }] }]}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', isDark ? 'rgba(10,10,20,0.98)' : 'rgba(255,255,255,0.98)']}
        locations={[0.2, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
      <RNAnimated.View style={[styles.heroContent, { opacity: headerOpacity, paddingTop: insets.top + 44 }]}>
        <Pressable onPress={onBackPress} style={styles.heroBackBtn}>
          <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={styles.heroBackBlur}>
            <View style={{ transform: [{ rotate: '90deg' }] }}>
              <IconSymbol name="chevron.down" size={20} color={colors.text} />
            </View>
          </BlurView>
        </Pressable>

        <View style={styles.heroMeta}>
          <Typography style={styles.artistName}>{name}</Typography>
          {subscribers && (
            <View style={styles.subPill}>
              <Typography style={styles.subPillText}>{subscribers}</Typography>
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
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  heroBackBtn: {
    alignSelf: 'flex-start',
  },
  heroBackBlur: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  heroMeta: {
    gap: 8,
  },
  artistName: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  subPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  subPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
