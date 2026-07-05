import { type AppTrack } from '@/components/player/Tracks';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useTrackOptions } from '@/contexts/track-options-context';
import { ChevronRight, Pause, Play, CheckCircle2, Loader2 } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Muted, Typography } from '../ui/typography';
import { PlayerActions, useDownloads } from '@/services';


export interface SongCardProps {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  index?: number;
  showIndex?: boolean;
  showRank?: boolean;
  rightIcon?: 'play' | 'chevron' | 'none';
  isActive?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
  /** Called instead of onPress when the song is already active — use for play/pause toggle */
  onTogglePress?: () => void;
  onLongPress?: () => void;
  track?: AppTrack;
  artistId?: string;
  albumId?: string;
}

export function SongCard({
  title,
  artist,
  album,
  artwork,
  index,
  showIndex = false,
  showRank = false,
  rightIcon = 'play',
  isActive = false,
  isPlaying = false,
  onPress,
  onTogglePress,
  onLongPress,
  track,
  artistId,
  albumId,
}: SongCardProps) {
  const { colors } = useAppTheme();
  const { openTrackOptions } = useTrackOptions();
  const { isDownloaded, downloadingIds } = useDownloads();
  const trackId = track?.id || (title + artist);
  const isDl = isDownloaded(trackId);
  const dlProgress = downloadingIds[trackId];
  const isDling = dlProgress !== undefined;

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress();
    } else {
      const trackObj: AppTrack = track || {
        id: title + artist,
        title,
        artist,
        album: album || '',
        artwork: artwork || '',
        url: '',
        duration: 0,
        artistId,
        albumId,
      };
      openTrackOptions(trackObj);
    }
  };

  const [imageUri, setImageUri] = React.useState<string | null>(
    artwork && artwork.trim() !== '' ? artwork : null
  );

  React.useEffect(() => {
    Promise.resolve().then(() => {
      setImageUri(artwork && artwork.trim() !== '' ? artwork : null);
    });
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
      android_ripple={{
        color: colors.border
      }}
      onPress={() => {
        // If already active: toggle play/pause instead of restarting
        if (isActive) {
          if (onTogglePress) {
            onTogglePress();
          } else {
            PlayerActions.playPause(isPlaying);
          }
        } else {
          onPress?.();
        }
      }}
      onLongPress={handleLongPress}
      delayLongPress={250}
      style={[
        styles.trackItem,
        isActive && { backgroundColor: addAlpha(colors.accent, 0.12), borderRadius: 14 }
      ]}
    >
      {showRank && typeof index === 'number' && (
        <View style={styles.trackIndexContainer}>
          <Muted style={[styles.trackIndex, { fontWeight: '700' }, isActive && { color: colors.primary }]}>
            {index + 1}
          </Muted>
        </View>
      )}

      {showIndex && typeof index === 'number' && !showRank ? (
        <View style={styles.trackIndexContainer}>
          <Muted style={[styles.trackIndex, { fontWeight: '700' }, isActive && { color: colors.primary }]}>
            {index + 1}
          </Muted>
        </View>
      ) : imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.trackArtwork}
          onError={handleImageError}
        />
      ) : (
        <Image source={require('@/assets/images/icon.png')} style={styles.trackArtwork} />
      )}

      <View style={styles.trackInfo}>
        <Typography
          numberOfLines={1}
          style={[{ fontSize: 15, fontWeight: '600' }, isActive ? { color: colors.primary, fontWeight: '700' } : undefined]}
        >
          {title}
        </Typography>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          {isDl && (
            <CheckCircle2
              size={12}
              color="#34C759"
              style={{ marginRight: 4 }}
            />
          )}
          {isDling && (
            <Loader2
              size={12}
              color={colors.primary}
              style={{ marginRight: 4 }}
            />
          )}
          <Muted numberOfLines={1} style={{ flex: 1 }}>
            {isDling ? `Downloading (${Math.round(dlProgress * 100)}%) • ` : ''}
            {artist}{album ? ` • ${album}` : ''}
          </Muted>
        </View>
      </View>

      {rightIcon === 'play' && (
        (isActive && isPlaying) ? <Pause size={18} style={styles.icon} strokeWidth={0} fill={colors.primary} /> : <Play size={18} style={styles.icon} strokeWidth={0} fill={colors.primary} />
      )}
      {rightIcon === 'chevron' && (
        <ChevronRight size={20} color={colors.muted} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  trackIndexContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackIndex: {
    fontSize: 15,
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 16,
  },
  placeholderArtwork: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  icon: {
    marginRight: 10,
  }
});
