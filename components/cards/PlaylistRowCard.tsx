import { useAppTheme } from '@/contexts/app-theme-context';
import { ThumbsUp, Folder, Trash2, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Muted, Typography } from '../ui/typography';

export interface PlaylistRowCardProps {
  id: string;
  name: string;
  songCount: number;
  artwork?: string | null;
  isLikedMusic?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onDeletePress?: () => void;
}

export function PlaylistRowCard({
  id,
  name,
  songCount,
  artwork,
  isLikedMusic = false,
  onPress,
  onLongPress,
  onDeletePress,
}: PlaylistRowCardProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      android_ripple={{
        color: colors.border,
      }}
      onPress={onPress}
      onLongPress={onLongPress || onPress}
      delayLongPress={250}
      style={styles.rowContainer}
    >
      {isLikedMusic ? (
        <LinearGradient
          colors={['#8E2DE2', '#4A00E0']}
          style={styles.likedIconContainer}
        >
          <ThumbsUp size={18} color="#ffffff" />
        </LinearGradient>
      ) : artwork && artwork.trim() !== '' ? (
        <Image source={{ uri: artwork }} style={styles.rowArtwork} />
      ) : (
        <View style={[styles.folderIconContainer, { backgroundColor: colors.card }]}>
          <Folder size={24} color={colors.primary} />
        </View>
      )}

      <View style={styles.rowInfo}>
        <Typography style={styles.playlistName} numberOfLines={1}>
          {name}
        </Typography>
        <Muted style={styles.playlistSub}>
          {isLikedMusic ? 'Auto playlist' : 'Playlist'} · {songCount} {songCount === 1 ? 'song' : 'songs'}
        </Muted>
      </View>
      {onDeletePress ? (
        <Pressable
          onPress={onDeletePress}
          style={styles.deleteBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={16} color="#FF3B30" />
        </Pressable>
      ) : (
        <ChevronRight size={18} color={colors.mutedForeground} style={styles.chevron} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  likedIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  folderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  rowArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 15,
  },
  rowInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
  },
  playlistSub: {
    fontSize: 13,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
  chevron: {
    marginRight: 4,
  },
});
