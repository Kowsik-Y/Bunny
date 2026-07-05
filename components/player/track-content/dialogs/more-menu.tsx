import { View, Image, Pressable, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Typography as Text } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { type AppTrack } from '../../Tracks';
import { PlayerSheet } from './player-sheet';
import { styles } from '../styles';
import { Heart } from 'lucide-react-native';

interface MoreMenuProps {
  visible: boolean;
  onClose: () => void;
  track: AppTrack;
  isFav: boolean;
  isLive: boolean;
  downloadingIds: Record<string, number>;
  isDownloaded: (id: string) => boolean;
  toggleFavorite: (track: AppTrack) => void;
  handleDownloadClick: () => void;
  handleShare: () => void;
  setShowPlaylistSelectModal: (val: boolean) => void;
  setShowAboutModal: (val: boolean) => void;
  setShowQualityModal: (val: boolean) => void;
}

export function MoreMenu({
  visible,
  onClose,
  track,
  isFav,
  isLive,
  downloadingIds,
  isDownloaded,
  toggleFavorite,
  handleDownloadClick,
  handleShare,
  setShowPlaylistSelectModal,
  setShowAboutModal,
  setShowQualityModal,
}: MoreMenuProps) {
  const { colors } = useAppTheme();
  return (
    <PlayerSheet visible={visible} onClose={onClose}>
      <View style={styles.moreHeader}>
        <Image
          source={
            track.artwork && (track.artwork as string).trim() !== ''
              ? { uri: track.artwork as string }
              : require('@/assets/images/icon.png')
          }
          style={styles.moreArt}
        />
        <View style={styles.moreHeaderInfo}>
          <Text style={[styles.moreTitle, { color: colors.text }]} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={{ color: colors.mutedForeground }} numberOfLines={1}>
            {track.artist}
            {track.description && ` • ${track.description}`}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => {
          toggleFavorite(track);
          onClose();
        }}
        android_ripple={{ color: colors.border }}
        style={styles.moreActionRow}
      >
        <Heart size={18} color={isFav ? '#FF3B30' : colors.text} />
        <Text style={[styles.moreActionText, { color: colors.text }]}>
          {isFav ? 'Remove from Favorites' : 'Add to Favorites'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          onClose();
          setTimeout(() => setShowPlaylistSelectModal(true), 250);
        }}
        android_ripple={{ color: colors.border }}
        style={styles.moreActionRow}
      >
        <Feather name="plus-circle" size={18} color={colors.text} />
        <Text style={[styles.moreActionText, { color: colors.text }]}>Add to Playlist</Text>
      </Pressable>

      {!isLive && (
        <Pressable
          onPress={handleDownloadClick}
          style={styles.moreActionRow}
          android_ripple={{ color: colors.border }}
          disabled={downloadingIds[track.id] !== undefined}
        >
          {downloadingIds[track.id] !== undefined ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather
              name={isDownloaded(track.id) ? 'check-circle' : 'download'}
              size={18}
              color={isDownloaded(track.id) ? '#34C759' : colors.text}
            />
          )}
          <Text style={[styles.moreActionText, { color: isDownloaded(track.id) ? '#34C759' : colors.text }]}>
            {downloadingIds[track.id] !== undefined
              ? `Downloading (${Math.round(downloadingIds[track.id] * 100)}%)`
              : isDownloaded(track.id)
                ? 'Downloaded'
                : 'Download Song'}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={handleShare}
        style={styles.moreActionRow}
        android_ripple={{ color: colors.border }}
      >
        <Feather name="share-2" size={18} color={colors.text} />
        <Text style={[styles.moreActionText, { color: colors.text }]}>Share Song</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          onClose();
          setTimeout(() => setShowAboutModal(true), 250);
        }}
        style={styles.moreActionRow}
        android_ripple={{ color: colors.border }}
      >
        <Feather name="info" size={18} color={colors.text} />
        <Text style={[styles.moreActionText, { color: colors.text }]}>Song Info</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          onClose();
          setTimeout(() => setShowQualityModal(true), 250);
        }}
        style={styles.moreActionRow}
        android_ripple={{ color: colors.border }}
      >
        <MaterialCommunityIcons name="waveform" size={18} color={colors.text} />
        <Text style={[styles.moreActionText, { color: colors.text }]}>Audio Quality</Text>
      </Pressable>
    </PlayerSheet>
  );
}
