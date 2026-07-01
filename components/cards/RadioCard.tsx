import { useAppTheme } from '@/contexts/app-theme-context';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { BunnyCard } from '../ui/bunny-card';
import { IconSymbol, IconSymbolName } from '../ui/icon-symbol';
import { Muted, Typography } from '../ui/typography';

export interface RadioCardProps {
  title: string;
  subtitle?: string;
  artwork?: string;
  color?: string; // background accent color
  icon?: IconSymbolName;
  onPress?: () => void;
}

export function RadioCard({
  title,
  subtitle,
  artwork,
  color,
  icon,
  onPress,
}: RadioCardProps) {
  const { colors } = useAppTheme();

  return (
    <BunnyCard
      tintColor={color}
      onPress={onPress}
      style={styles.radioCard}
    >
      <View style={[styles.radioIconContainer, { backgroundColor: (color || colors.primary) + '20' }]}>
        {artwork ? (
          <Image source={{ uri: artwork }} style={styles.cardImage} />
        ) : (
          <IconSymbol name={(icon || 'quote.bubble') as any} size={24} color={color || colors.primary} />
        )}
      </View>
      <Typography variant="large" numberOfLines={1}>{title}</Typography>
      <Muted>{subtitle}</Muted>
    </BunnyCard>
  );
}

const styles = StyleSheet.create({
  radioCard: {
    width: 140,
    height: 175,
    marginRight: 16,
  },
  radioIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
});
