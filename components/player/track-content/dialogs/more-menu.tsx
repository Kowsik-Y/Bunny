import { View, Image, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';

import { Typography as Text } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { type AppTrack } from '../../Tracks';
import { PlayerSheet } from './player-sheet';
import { styles } from '../styles';
import { ThumbsUp, ListMusic, AudioLines, Disc, User, CheckCircle2, Download, Share2, Info, BarChart2, ListX, Clock, Save, SlidersHorizontal, Repeat, Sliders, PhoneCall, Users } from 'lucide-react-native';
import { BottomSheetScrollView } from '../../SwipeBottomSheet';
import { useSleepTimer } from '@/services/sleepTimer';
import { useTrackOptions } from '@/contexts/track-options';

interface MoreMenuProps {
  visible: boolean;
  onClose: () => void;
  track: AppTrack;
  isFav: boolean;
  isLive: boolean;
  repeatOn?: boolean;
  onRepeat?: () => void;
  downloadingIds: Record<string, number>;
  isDownloaded: (id: string) => boolean;
  toggleFavorite: (track: AppTrack) => void;
  handleDownloadClick: () => void;
  handleShare: () => void;
  setShowPlaylistSelectModal: (val: boolean) => void;
  setShowAboutModal: (val: boolean) => void;
  setShowQualityModal: (val: boolean) => void;
  setShowStatsModal: (val: boolean) => void;
  setShowSleepTimerModal: (val: boolean) => void;
  trackOptionsState: any;
  handleArtistPress: () => void;
}

export function MoreMenu({
  visible,
  onClose,
  track,
  isFav,
  isLive,
  repeatOn = false,
  onRepeat,
  downloadingIds,
  isDownloaded,
  toggleFavorite,
  handleDownloadClick,
  handleShare,
  setShowPlaylistSelectModal,
  setShowAboutModal,
  setShowQualityModal,
  setShowStatsModal,
  setShowSleepTimerModal,
  trackOptionsState,
  handleArtistPress,
}: MoreMenuProps) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { secondsRemaining, stopAtTrackEnd, cancelTimer } = useSleepTimer();
  const { openCreditsSheet } = useTrackOptions();

  const formatRemainingTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

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


  const handleCreditsClick = () => {
    onClose();
    setTimeout(() => {
      openCreditsSheet(track);
    }, 250);
  };

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
          <ThumbsUp size={18} color={isLiked ? '#FF3B30' : colors.text} />
          <Text style={[styles.moreActionText, { color: isLiked ? '#FF3B30' : colors.text }]}>
            {isLiked ? 'Remove from library' : 'Save to library'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            onRepeat?.();
            onClose();
          }}
          android_ripple={{ color: colors.border }}
          style={styles.moreActionRow}
        >
          <Repeat size={18} color={repeatOn ? colors.primary : colors.text} />
          <Text style={[styles.moreActionText, { color: repeatOn ? colors.primary : colors.text }]}>
            {repeatOn ? 'Repeat Mode: On' : 'Repeat Mode: Off'}
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
              <Save size={18} color="#34C759" />
            ) : (
              <Download size={18} color={colors.text} />
            )}
            <Text style={[styles.moreActionText, { color: isDownloaded(track.id) ? '#34C759' : colors.text }]}>
              {downloadingIds[track.id] !== undefined
                ? downloadingIds[track.id] >= 0.95
                  ? downloadingIds[track.id] >= 0.97
                    ? 'Embedding metadata…'
                    : 'Getting LRC…'
                  : `Downloading (${Math.round((downloadingIds[track.id] / 0.95) * 100)}%)`
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
            setTimeout(() => setShowSleepTimerModal(true), 250);
          }}
          style={styles.moreActionRow}
          android_ripple={{ color: colors.border }}
        >
          <Clock size={18} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>
            {secondsRemaining !== null
              ? `Sleep Timer (${formatRemainingTime(secondsRemaining)})`
              : stopAtTrackEnd
                ? 'Sleep Timer (End of Track)'
                : 'Sleep Timer'}
          </Text>
        </Pressable>

        {(secondsRemaining !== null || stopAtTrackEnd) && (
          <Pressable
            onPress={() => {
              cancelTimer();
              onClose();
            }}
            style={styles.moreActionRow}
            android_ripple={{ color: colors.border }}
          >
            <Clock size={18} color="#FF3B30" />
            <Text style={[styles.moreActionText, { color: '#FF3B30', fontWeight: '700' }]}>
              Stop Sleep Timer
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={handleCreditsClick}
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
            onClose();
            setTimeout(() => {
              router.push('/settings/equalizer' as any);
            }, 250);
          }}
          style={styles.moreActionRow}
          android_ripple={{ color: colors.border }}
        >
          <Sliders size={18} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Equalizer & Bass</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            onClose();
            setTimeout(() => {
              router.push('/settings/party' as any);
            }, 250);
          }}
          style={styles.moreActionRow}
          android_ripple={{ color: colors.border }}
        >
          <Users size={18} color={colors.text} />
          <Text style={[styles.moreActionText, { color: colors.text }]}>Music Party</Text>
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
