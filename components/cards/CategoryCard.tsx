import { useAppTheme } from '@/contexts/app-theme-context';
import React from 'react';
import { StyleSheet } from 'react-native';
import { BunnyCard } from '../ui/bunny-card';
import { IconSymbol, IconSymbolName } from '../ui/icon-symbol';
import { Typography } from '../ui/typography';

export interface CategoryCardProps {
  title: string;
  color?: string; // background/tint accent color
  icon?: IconSymbolName;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function CategoryCard({
  title,
  color,
  icon,
  onPress,
  onLongPress,
}: CategoryCardProps) {
  const { colors } = useAppTheme();

  return (
    <BunnyCard
      tintColor={color}
      onPress={onPress}
      onLongPress={onLongPress || onPress}
      style={styles.categoryCard}
      contentContainerStyle={styles.categoryCardInner}
    >
      <IconSymbol name={icon || 'music.note'} size={28} color={color || colors.primary} />
      <Typography variant="large" style={styles.categoryText}>{title}</Typography>
    </BunnyCard>
  );
}

const styles = StyleSheet.create({
  categoryCard: {
    flex: 1,
    height: 100,
  },
  categoryCardInner: {
    padding: 16,
    height: '100%',
    justifyContent: 'space-between',
  },
  categoryText: {
    fontWeight: '600',
  },
});
