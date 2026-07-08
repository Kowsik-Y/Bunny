import { useAppTheme } from '@/contexts/app-theme-context';
import { ThumbsUp, Folder } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Muted, Typography } from '../ui/typography';

export interface PlaylistCardProps {
  id: string;
  name: string;
  songCount?: number;
  artwork?: string | null;
  isLikedMusic?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: any;
}

export function PlaylistCard({
  id,
  name,
  songCount,
  artwork,
  isLikedMusic = false,
  onPress,
  onLongPress,
  style,
}: PlaylistCardProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      style={[styles.cardContainer, style]}
      onPress={onPress}
      onLongPress={onLongPress || onPress}
      delayLongPress={250}
    >
      {isLikedMusic ? (
        <LinearGradient
          colors={['#8E2DE2', '#4A00E0']}
          style={styles.cardArtwork}
        >
          <ThumbsUp size={36} color="#ffffff" />
        </LinearGradient>
      ) : artwork && artwork.trim() !== '' ? (
        <Image source={{ uri: artwork }} style={styles.cardArtwork} />
      ) : (
        <View style={[styles.cardArtwork, styles.cardPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Folder size={36} color={colors.primary} />
        </View>
      )}

      <Typography
        variant="small"
        numberOfLines={1}
        style={[styles.cardName, { color: colors.text }]}
      >
        {name}
      </Typography>
      {typeof songCount === 'number' && (
        <Muted numberOfLines={1} style={styles.cardSub}>
          {songCount} {songCount === 1 ? 'song' : 'songs'}
        </Muted>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    width: 140,
    marginRight: 16,
    overflow: 'hidden',
  },
  cardArtwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlaceholder: {
    borderWidth: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
  },
});
