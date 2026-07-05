import { useAppTheme } from '@/contexts/app-theme-context';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Muted, Typography } from '../ui/typography';

export interface ArtistCardProps {
  name: string;
  artwork?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ArtistCard({
  name,
  artwork,
  onPress,
  onLongPress,
}: ArtistCardProps) {
  const { colors } = useAppTheme();

  const [imageUri, setImageUri] = React.useState<string | null>(
    artwork && artwork.trim() !== '' ? artwork : null
  );

  React.useEffect(() => {
    setImageUri(artwork && artwork.trim() !== '' ? artwork : null);
  }, [artwork]);

  const handleImageError = () => {
    if (imageUri && imageUri.includes('/maxresdefault.jpg')) {
      setImageUri(imageUri.replace('/maxresdefault.jpg', '/hqdefault.jpg'));
    } else {
      setImageUri(null);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress || onPress}
      delayLongPress={250}
      style={styles.container}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.artwork}
          onError={handleImageError}
        />
      ) : (
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.artwork}
        />
      )}

      <View style={styles.info}>
        <Typography
          variant="large"
          numberOfLines={1}
        >
          {name}
        </Typography>
        <Muted numberOfLines={1}>
          Artist
        </Muted>
      </View>

      <ChevronRight size={20} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 24, // Circular artwork for artists
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
});
