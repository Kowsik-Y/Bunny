import { type AppTrack } from '@/components/player/Tracks';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useTrackOptions } from '@/contexts/track-options-context';
import { ChevronRight, Pause, Play, Save, Loader2, CheckCircle2, Circle } from 'lucide-react-native';
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
  explicit?: boolean;
  isSelected?: boolean;
  isSelectMode?: boolean;
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
  explicit,
  isSelected = false,
  isSelectMode = false,
}: SongCardProps) {
  const { colors } = useAppTheme();
  const { openTrackOptions } = useTrackOptions();
  const { isDownloaded, downloadingIds, hasDownloadedLrc } = useDownloads();
  const trackId = track?.id || (title + artist);
  const isDl = isDownloaded(trackId);
  const dlProgress = downloadingIds[trackId];
  const isDling = dlProgress !== undefined;
  const hasLrc = hasDownloadedLrc(trackId);
  const isExplicit = explicit || track?.explicit;

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
        if (isSelectMode) {
          onPress?.();
        } else if (isActive) {
          if (onTogglePress) {
            onTogglePress();
          } else {
            PlayerActions.playPause(isPlaying);
          }
        } else {
          onPress?.();
        }
      }}
      onLongPress={isSelectMode ? undefined : handleLongPress}
      delayLongPress={250}
      style={[
        styles.trackItem,
        isActive && !isSelectMode && { backgroundColor: addAlpha(colors.accent, 0.12), borderRadius: 14 },
        isSelected && { backgroundColor: addAlpha(colors.primary, 0.08), borderRadius: 14 }
      ]}
    >
      {isSelectMode && (
        <View style={{ marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
          {isSelected ? (
            <CheckCircle2 size={20} color={colors.primary} />
          ) : (
            <Circle size={20} color={colors.mutedForeground} />
          )}
        </View>
      )}
      {showRank && typeof index === 'number' && (
        <View style={styles.trackIndexContainer}>
          <Muted style={[styles.trackIndex, { fontWeight: '700' }, isActive && { color: colors.primary }]}>
            {String(index + 1).padStart(2, '0')}
          </Muted>
        </View>
      )}

      {showIndex && typeof index === 'number' && !showRank ? (
        <View style={styles.trackIndexContainer}>
          <Muted style={[styles.trackIndex, { fontWeight: '700' }, isActive && { color: colors.primary }]}>
            {String(index + 1).padStart(2, '0')}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Typography
            numberOfLines={1}
            style={[{ fontSize: 15, fontWeight: '600', flexShrink: 1 }, isActive ? { color: colors.primary, fontWeight: '700' } : undefined]}
          >
            {title}
          </Typography>
          {isExplicit && (
            <View style={{
              backgroundColor: colors.mutedForeground,
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 3,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Typography style={{ fontSize: 9, fontWeight: '800', color: colors.background, lineHeight: 11 }}>
                E
              </Typography>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
          {isDl && (
            <Save
              size={12}
              color="#34C759"
              style={{ marginRight: 4 }}
            />
          )}
          {hasLrc && (
            <View style={{
              backgroundColor: addAlpha(colors.primary, 0.12),
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 4,
              marginRight: 6,
            }}>
              <Typography style={{ fontSize: 9, fontWeight: '800', color: colors.primary, lineHeight: 11 }}>
                LRC
              </Typography>
            </View>
          )}
          {isDling && (
            <Loader2
              size={12}
              color={colors.primary}
              style={{ marginRight: 4 }}
            />
          )}
          <Muted numberOfLines={1} style={{ flex: 1 }}>
            {isDling
              ? dlProgress >= 0.95
                ? dlProgress >= 0.97
                  ? 'Embedding metadata… • '
                  : 'Getting LRC… • '
                : `Downloading (${Math.round((dlProgress / 0.95) * 100)}%) • `
              : ''}
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
