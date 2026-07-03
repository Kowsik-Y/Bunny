import { useAppTheme } from '@/contexts/app-theme-context';
import { Image, Pressable, StyleSheet } from 'react-native';
import { Muted, Typography } from '../ui/typography';

export type AlbumCardVariant = 'carousel' | 'grid';

export interface AlbumCardProps {
  title: string;
  subtitle?: string;
  artwork?: string;
  type?: 'album' | 'playlist' | 'artist' | 'radio' | 'category';
  variant?: AlbumCardVariant;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function AlbumCard({
  title,
  subtitle,
  artwork,
  type = 'album',
  variant = 'carousel',
  onPress,
  onLongPress,
}: AlbumCardProps) {
  const { colors } = useAppTheme();

  if (variant === 'carousel') {
    const isArtist = type === 'artist';
    return (
      <Pressable
        style={[styles.carouselCard, isArtist && { width: 110 }]}
        onPress={onPress}
        onLongPress={onLongPress || onPress}
        delayLongPress={250}
        android_ripple={{
          color: colors.accent,
        }}
      >
        <Image
          source={artwork && artwork.trim() !== '' ? { uri: artwork } : require('@/assets/images/icon.png')}
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
        onLongPress={onLongPress || onPress}
        delayLongPress={250}
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
