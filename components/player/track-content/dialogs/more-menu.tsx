import { View, Image, Pressable, ActivityIndicator } from 'react-native';

import { Typography as Text } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { type AppTrack } from '../../Tracks';
import { PlayerSheet } from './player-sheet';
import { styles } from '../styles';
import { Heart, ListMusic, AudioLines, Disc, User, CheckCircle2, Download, Share2, Info, BarChart2, ListX } from 'lucide-react-native';
import { BottomSheetScrollView } from '../../SwipeBottomSheet';

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
  setShowStatsModal: (val: boolean) => void;
  trackOptionsState: any;
  handleArtistPress: () => void;
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
  setShowStatsModal,
  trackOptionsState,
  handleArtistPress,
}: MoreMenuProps) {
  const { colors } = useAppTheme();

  const {
    handlePlayNext,
    handleAddToQueue,
    handleToggleLike,
    handleRemoveFromQueue,
    handleGoToAlbum,
    handleGoToArtist,
    handleDismissQueue,
    isFavorite,
  } = trackOptionsState;

  const isLiked = track ? isFavorite(track.id) : false;

  return (
    <PlayerSheet visible={visible} onClose={onClose}>
      <View style={{...styles.moreHeader,borderColor:colors.border}}>
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
            {track.album && ` • ${track.album}`}
          </Text>
        </View>
      </View>

        <Pressable
          onPress={() => {
            handleToggleLike();
            onClose();
          }}
          android_ripple={{ color: colors.border }}
          style={styles.moreActionRow}
        >
          <Heart size={18} color={isLiked ? '#FF3B30' : colors.text} fill={isLiked ? '#FF3B30' : 'none'} />
          <Text style={[styles.moreActionText, { color: isLiked ? '#FF3B30' : colors.text }]}>
            {isLiked ? 'Remove from library' : 'Save to library'}
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
          <ListMusic size={20} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Save to playlist</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            onClose();
            setTimeout(() => setShowQualityModal(true), 250);
          }}
          style={styles.moreActionRow}
          android_ripple={{ color: colors.border }}
        >
          <AudioLines size={18} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Audio Quality</Text>
        </Pressable>

        {track.albumId && (
          <Pressable
            onPress={() => {
              handleGoToAlbum();
              onClose();
            }}
            android_ripple={{ color: colors.border }}
            style={styles.moreActionRow}
          >
            <Disc size={20} color={colors.text} />
            <Text style={[styles.moreActionText, { color: colors.text }]}>Go to album</Text>
          </Pressable>
        )}

        {(track.artistId || (track.artists && track.artists.length > 0)) && (
          <Pressable
            onPress={() => {
              onClose();
              setTimeout(() => handleArtistPress(), 250);
            }}
            android_ripple={{ color: colors.border }}
            style={styles.moreActionRow}
          >
            <User size={20} color={colors.text} />
            <Text style={[styles.moreActionText, { color: colors.text }]}>Go to artist</Text>
          </Pressable>
        )}

        {!isLive && (
          <Pressable
            onPress={handleDownloadClick}
            style={styles.moreActionRow}
            android_ripple={{ color: colors.border }}
            disabled={downloadingIds[track.id] !== undefined}
          >
            {downloadingIds[track.id] !== undefined ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : isDownloaded(track.id) ? (
              <CheckCircle2 size={18} color="#34C759" />
            ) : (
              <Download size={18} color={colors.text} />
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
          <Share2 size={18} color={colors.text} />
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
          <Info size={18} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>View song credits</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            onClose();
            setTimeout(() => setShowStatsModal(true), 250);
          }}
          style={styles.moreActionRow}
          android_ripple={{ color: colors.border }}
        >
          <BarChart2 size={20} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Stats for nerds</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            handleDismissQueue();
            onClose();
          }}
          style={styles.moreActionRow}
          android_ripple={{ color: colors.border }}
        >
          <ListX size={20} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Dismiss queue</Text>
        </Pressable>
    </PlayerSheet>
  );
}
