import { Share } from 'react-native';
import { useRouter } from 'expo-router';
import TrackPlayer from 'react-native-track-player';
import { type AppTrack } from '@/components/player/Tracks';
import { PlayerActions, toast } from '@/services';

interface TrackActionsParams {
  selectedTrack: AppTrack | null;
  setVisible: (visible: boolean) => void;
  setArtistOptions: (options: Array<{ name: string; id: string }>) => void;
  setShowArtistSheet: (show: boolean) => void;
  setDismissQueueVisible: (visible: boolean) => void;
  toggleFavorite: (track: AppTrack) => Promise<void>;
  isFavorite: (id: string) => boolean;
  startDownload: (track: AppTrack) => Promise<boolean>;
  isDownloaded: (id: string) => boolean;
  downloadingIds: Record<string, number>;
  removeDownload: (id: string) => Promise<void>;
}

export function useTrackActions({
  selectedTrack,
  setVisible,
  setArtistOptions,
  setShowArtistSheet,
  setDismissQueueVisible,
  toggleFavorite,
  isFavorite,
  startDownload,
  isDownloaded,
  downloadingIds,
  removeDownload,
}: TrackActionsParams) {
  const router = useRouter();

  const handlePlayNext = async () => {
    if (!selectedTrack) return;
    try {
      const activeIdx = await TrackPlayer.getActiveTrackIndex();
      const insertIdx = typeof activeIdx === 'number' ? activeIdx + 1 : 0;
      await TrackPlayer.add([selectedTrack], insertIdx);
      toast.success('Added to play next');
      setVisible(false);
    } catch (e) {
      console.warn('Play next error', e);
      toast.error('Failed to add to play next');
    }
  };

  const handleAddToQueue = async () => {
    if (!selectedTrack) return;
    try {
      await PlayerActions.addTrack(selectedTrack, false);
      toast.success('Added to queue');
      setVisible(false);
    } catch (e) {
      toast.error('Failed to add to queue');
    }
  };

  const handleToggleLike = async () => {
    if (!selectedTrack) return;
    await toggleFavorite(selectedTrack);
    const liked = isFavorite(selectedTrack.id);
    toast.success(liked ? 'Removed from Liked Songs' : 'Added to Liked Songs');
    setVisible(false);
  };

  const handleDownload = async () => {
    if (!selectedTrack) return;
    if (isDownloaded(selectedTrack.id)) {
      await removeDownload(selectedTrack.id);
      toast.success('Removed from downloads');
      setVisible(false);
      return;
    }
    if (downloadingIds[selectedTrack.id] !== undefined) {
      return;
    }
    try {
      await startDownload(selectedTrack);
      toast.success('Download started');
      setVisible(false);
    } catch (e) {
      toast.error('Failed to download track');
    }
  };

  const handleRemoveFromQueue = async () => {
    if (!selectedTrack) return;
    try {
      const queue = await TrackPlayer.getQueue();
      const idx = queue.findIndex(t => String(t.id) === String(selectedTrack.id));
      if (idx >= 0) {
        await TrackPlayer.remove(idx);
        toast.success('Removed from queue');
      } else {
        toast.info('Track is not in the queue');
      }
      setVisible(false);
    } catch (e) {
      toast.error('Failed to remove from queue');
    }
  };

  const handleGoToAlbum = () => {
    if (!selectedTrack) return;
    setVisible(false);
    if (selectedTrack.albumId) {
      router.push(`/album/${selectedTrack.albumId}` as any);
    }
  };

  const handleGoToArtist = () => {
    if (!selectedTrack) return;
    setVisible(false);
    if (selectedTrack.artists && selectedTrack.artists.length > 1) {
      setArtistOptions(selectedTrack.artists);
      setShowArtistSheet(true);
    } else if (selectedTrack.artistId) {
      router.push(`/artist/${selectedTrack.artistId}` as any);
    }
  };

  const handleShare = async () => {
    if (!selectedTrack) return;
    setVisible(false);
    try {
      const videoId = selectedTrack.id.startsWith('yt-') ? selectedTrack.id.substring(3) : selectedTrack.id;
      await Share.share({
        message: `Listen to "${selectedTrack.title}" by ${selectedTrack.artist}: https://music.youtube.com/watch?v=${videoId}`,
      });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleDismissQueue = () => {
    setVisible(false);
    setDismissQueueVisible(true);
  };

  const confirmDismissQueue = async () => {
    await TrackPlayer.reset();
    toast.success('Queue cleared');
  };

  const handlePinListenAgain = () => {
    setVisible(false);
    toast.success('Pinned to Listen Again');
  };

  return {
    handlePlayNext,
    handleAddToQueue,
    handleToggleLike,
    handleDownload,
    handleRemoveFromQueue,
    handleGoToAlbum,
    handleGoToArtist,
    handleShare,
    handleDismissQueue,
    confirmDismissQueue,
    handlePinListenAgain,
  };
}
