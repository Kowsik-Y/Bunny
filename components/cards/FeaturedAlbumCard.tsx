import { useAppTheme } from '@/contexts/app-theme-context';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { BunnyCard } from '../ui/bunny-card';
import { IconSymbol } from '../ui/icon-symbol';
import { Typography } from '../ui/typography';

export interface FeaturedAlbumCardProps {
  title: string;
  subtitle?: string;
  artwork?: string;
  color?: string; // tintColor or background accent color
  onPress?: () => void;
  onLongPress?: () => void;
}

export function FeaturedAlbumCard({
  title,
  subtitle,
  artwork,
  color,
  onPress,
  onLongPress,
}: FeaturedAlbumCardProps) {
  const { colors } = useAppTheme();

  return (
    <BunnyCard
      tintColor={color}
      onPress={onPress}
      onLongPress={onLongPress || onPress}
      style={styles.featuredCard}
    >
      <View style={[styles.featuredIconPlaceholder, { backgroundColor: (color || colors.primary) + '30' }]}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.cardImage} />
        ) : (
          <IconSymbol name="play.fill" size={26} color={colors.primary} active />
        )}
      </View>
      <Typography variant="large" numberOfLines={1}>{title}</Typography>
      <Typography variant="small" numberOfLines={1}>{subtitle}</Typography>
    </BunnyCard>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    width: 160,
    height: 200,
    marginRight: 16,
  },
  featuredIconPlaceholder: {
    width: '100%',
    height: 110,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});
