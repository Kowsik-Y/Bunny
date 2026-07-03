import { StyleSheet, View, Image, Dimensions } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { H1, Muted, Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/contexts/app-theme-context';
import { type AppTrack } from '@/components/player/Tracks';
import { addAlpha } from '@/constants/theme';
import { Play, Pause, Shuffle, Download } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface PlaylistHeaderProps {
  playlistName: string;
  playlistTracks: AppTrack[];
  artworkUrl: string | null;
  totalDuration: number;
  onPlayPress: () => void;
  onShufflePress: () => void;
  onDownloadPress: () => void;
  isPlayingPlaylist?: boolean;
}

export function PlaylistHeader({
  playlistName,
  playlistTracks,
  artworkUrl,
  totalDuration,
  onPlayPress,
  onShufflePress,
  onDownloadPress,
  isPlayingPlaylist = false,
}: PlaylistHeaderProps) {
  const { colors } = useAppTheme();

  return (
    <>
      <View style={styles.playlistHeader}>
        <Animated.View entering={FadeInUp.duration(600)} style={styles.artworkContainer}>
          {artworkUrl && artworkUrl.trim() !== '' ? (
            <Image source={{ uri: artworkUrl }} style={styles.artwork} />
          ) : playlistTracks.length > 0 ? (
            <View style={styles.gridArtwork}>
              {playlistTracks.slice(0, 4).map((t, i) => (
                <Image key={i} source={t.artwork && t.artwork.trim() !== '' ? { uri: t.artwork } : require('@/assets/images/icon.png')} style={styles.gridImage} />
              ))}
            </View>
          ) : (
            <Image source={require('@/assets/images/icon.png')} style={styles.artwork} />
          )}
        </Animated.View>

        <View style={styles.playlistMeta}>
          <H1 style={styles.playlistTitle}>{playlistName}</H1>
          <Muted style={styles.playlistStats}>
            {playlistTracks.length} tracks, {Math.floor(totalDuration / 60)} min
          </Muted>

          <View style={styles.actionRow}>
            <Button variant="default" style={styles.mainAction} onPress={onPlayPress}>
              {isPlayingPlaylist ? (
                <Pause size={20} color={colors.background} fill={colors.background} />
              ) : (
                <Play size={20} color={colors.background} fill={colors.background} />
              )}
              <Typography style={{ color: colors.background, fontWeight: '600', marginLeft: 8 }}>
                {isPlayingPlaylist ? "Pause" : "Play"}
              </Typography>
            </Button>
            <Button variant="secondary" size="icon" onPress={onShufflePress}>
              <Shuffle size={20} color={colors.primary} />
            </Button>
            <Button variant="secondary" size="icon" onPress={onDownloadPress}>
              <Download size={20} color={colors.primary} />
            </Button>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerNav: {
    position: 'absolute',
    top: 10,
    left: 15,
    zIndex: 10,
  },
  playlistHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 60,
  },
  artworkContainer: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  gridArtwork: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
  },
  gridImage: {
    width: '50%',
    height: '50%',
  },
  playlistMeta: {
    alignItems: 'center',
  },
  playlistTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  playlistStats: {
    textAlign: 'center',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
    alignItems: 'center',
  },
  mainAction: {
    height: 48,
    borderRadius: 24,
  },
});
