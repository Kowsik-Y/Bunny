import { useAppTheme } from '@/contexts/app-theme-context';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Muted, Typography } from '../ui/typography';

export interface AlbumRowCardProps {
  title: string;
  artist: string;
  artwork?: string;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function AlbumRowCard({
  title,
  artist,
  artwork,
  onPress,
  onLongPress,
}: AlbumRowCardProps) {
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
          {title}
        </Typography>
        <Muted numberOfLines={1}>
          Album • {artist}
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
    borderRadius: 8,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
});
