import { StyleSheet, View, Image, Pressable } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from './bunny-card';
import { IconSymbol, IconSymbolName } from './icon-symbol';
import { Typography, Muted } from './typography';

export type AlbumCardVariant = 'featured' | 'radio' | 'category' | 'carousel' | 'grid';

export interface AlbumCardProps {
  title: string;
  subtitle?: string;
  artwork?: string;
  color?: string; // tintColor or background accent color
  icon?: IconSymbolName; // icon name if applicable
  type?: 'album' | 'playlist' | 'artist' | 'radio' | 'category';
  variant?: AlbumCardVariant;
  onPress?: () => void;
}

export function AlbumCard({
  title,
  subtitle,
  artwork,
  color,
  icon,
  type = 'album',
  variant = 'carousel',
  onPress,
}: AlbumCardProps) {
  const { colors } = useAppTheme();

  if (variant === 'carousel') {
    const isArtist = type === 'artist';
    return (
      <Pressable
        style={[styles.carouselCard, isArtist && { width: 110 }]}
        onPress={onPress}
        android_ripple={{
          color: colors.accent,
        }}
      >
        <Image
          source={{ uri: artwork || 'https://picsum.photos/150/150' }}
          style={[styles.carouselArtwork, isArtist && { borderRadius: 55, width: 110, height: 110 }]}
        />
        <Typography 
          variant="small"
          numberOfLines={1} 
          style={[styles.carouselName, { color: colors.text }, isArtist && { textAlign: 'center' }]}
        >
          {title}
        </Typography>
        {!isArtist && (
          <Muted numberOfLines={1} style={styles.carouselSub}>
            {subtitle || (type === 'album' ? 'Album' : 'Playlist')}
          </Muted>
        )}
      </Pressable>
    );
  }

  if (variant === 'grid') {
    return (
      <Pressable
        style={styles.gridCard}
        onPress={onPress}
        android_ripple={{
          color: colors.accent,
        }}
      >
        <Image
          source={{ uri: artwork || 'https://picsum.photos/150/150' }}
          style={styles.gridArtwork}
        />
        <Typography 
          variant="small"
          numberOfLines={1} 
          style={[styles.carouselName, { color: colors.text }]}
        >
          {title}
        </Typography>
        <Muted numberOfLines={1} style={styles.carouselSub}>
          {subtitle || (type === 'album' ? 'Album' : 'Playlist')}
        </Muted>
      </Pressable>
    );
  }

  if (variant === 'category') {
    return (
      <BunnyCard
        tintColor={color}
        onPress={onPress}
        style={styles.categoryCard}
        contentContainerStyle={styles.categoryCardInner}
      >
        <IconSymbol name={icon || 'music.note'} size={28} color={color || colors.primary} />
        <Typography variant="large" style={styles.categoryText}>{title}</Typography>
      </BunnyCard>
    );
  }

  if (variant === 'featured') {
    return (
      <BunnyCard
        tintColor={color}
        onPress={onPress}
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

  if (variant === 'radio') {
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

  return null;
}

const styles = StyleSheet.create({
  carouselCard: {
    width: 140,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  carouselArtwork: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginBottom: 8,
  },
  carouselName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  carouselSub: {
    fontSize: 12,
  },
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
  gridCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gridArtwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 8,
  },
});
