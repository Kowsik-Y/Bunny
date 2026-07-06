import { Share, DeviceEventEmitter } from 'react-native';
import { useRouter } from 'expo-router';
import TrackPlayer from 'react-native-track-player';
import { type AppTrack } from '@/components/player/Tracks';
import { toast } from '@/services';
import { getAlbumDetails, getPlaylistDetails } from '@/services/ytMusic';
import { SelectedItemState } from '../types';
import { getLocalPlaylists, createLocalPlaylist, addTrackToLocalPlaylist } from '@/services/playlists/storage';

interface CollectionActionsParams {
  selectedItem: SelectedItemState | null;
  setVisible: (visible: boolean) => void;
  startDownload: (track: AppTrack) => Promise<boolean>;
  addFavorite: (track: AppTrack) => Promise<void>;
  addTrackToPlaylist: (playlistId: string, track: AppTrack) => Promise<boolean>;
}

export function useCollectionActions({
  selectedItem,
  setVisible,
  startDownload,
  addFavorite,
  addTrackToPlaylist,
}: CollectionActionsParams) {
  const router = useRouter();

  const handlePlayNextCollection = async () => {
    if (!selectedItem) return;
    setVisible(false);
    toast.info('Resolving tracks...');
    try {
      let tracksData: AppTrack[] = [];
      if (selectedItem.type === 'album') {
        const albumDetails = await getAlbumDetails(selectedItem.id);
        tracksData = (albumDetails.tracks || []).map((t: any) => ({
          id: t.videoId,
          title: t.name,
          artist: selectedItem.artist || 'Unknown Artist',
          album: selectedItem.title,
          artwork: selectedItem.artwork || '',
          duration: t.duration / 1000,
          url: `https://dummy.com/track-${t.videoId}.mp3`,
          artistId: selectedItem.artistId,
          albumId: selectedItem.id,
        }));
      } else if (selectedItem.type === 'playlist') {
        const playlistDetails = await getPlaylistDetails(selectedItem.id);
        tracksData = playlistDetails.tracks;
      }
      
      if (tracksData.length > 0) {
        const currentQueue = await TrackPlayer.getQueue();
        const currentIds = new Set(currentQueue.map(t => String(t.id)));
        const newTracks = tracksData.filter(t => !currentIds.has(String(t.id)));

        if (newTracks.length > 0) {
          const activeIdx = await TrackPlayer.getActiveTrackIndex();
          const insertIdx = typeof activeIdx === 'number' ? activeIdx + 1 : 0;
          await TrackPlayer.add(newTracks, insertIdx);
          toast.success(`Queued ${newTracks.length} new songs next`);
        } else {
          toast.info('All songs in this collection are already in the queue');
        }
      } else {
        toast.info('No tracks found');
      }
    } catch (e) {
      console.warn('Play next collection error', e);
      toast.error('Failed to add to play next');
    }
  };

  const handleAddToQueueCollection = async () => {
    if (!selectedItem) return;
    setVisible(false);
    toast.info('Resolving tracks...');
    try {
      let tracksData: AppTrack[] = [];
      if (selectedItem.type === 'album') {
        const albumDetails = await getAlbumDetails(selectedItem.id);
        tracksData = (albumDetails.tracks || []).map((t: any) => ({
          id: t.videoId,
          title: t.name,
          artist: selectedItem.artist || 'Unknown Artist',
          album: selectedItem.title,
          artwork: selectedItem.artwork || '',
          duration: t.duration / 1000,
          url: `https://dummy.com/track-${t.videoId}.mp3`,
          artistId: selectedItem.artistId,
          albumId: selectedItem.id,
        }));
      } else if (selectedItem.type === 'playlist') {
        const playlistDetails = await getPlaylistDetails(selectedItem.id);
        tracksData = playlistDetails.tracks;
      }

      if (tracksData.length > 0) {
        const currentQueue = await TrackPlayer.getQueue();
        const currentIds = new Set(currentQueue.map(t => String(t.id)));
        const newTracks = tracksData.filter(t => !currentIds.has(String(t.id)));

        if (newTracks.length > 0) {
          await TrackPlayer.add(newTracks);
          toast.success(`Added ${newTracks.length} new songs to queue`);
        } else {
          toast.info('All songs in this collection are already in the queue');
        }
      } else {
        toast.info('No tracks found');
      }
    } catch (e) {
      console.warn('Queue collection error', e);
      toast.error('Failed to add to queue');
    }
  };

  const handleDownloadCollection = async () => {
    if (!selectedItem) return;
    setVisible(false);
    toast.info('Downloading collection...');
    try {
      let tracksData: AppTrack[] = [];
      let collectionName = '';
      if (selectedItem.type === 'album') {
        collectionName = selectedItem.title;
        const albumDetails = await getAlbumDetails(selectedItem.id);
        tracksData = (albumDetails.tracks || []).map((t: any) => ({
          id: t.videoId,
          title: t.name,
          artist: selectedItem.artist || 'Unknown Artist',
          album: selectedItem.title,
          artwork: selectedItem.artwork || '',
          duration: t.duration / 1000,
          url: `https://dummy.com/track-${t.videoId}.mp3`,
          artistId: selectedItem.artistId,
          albumId: selectedItem.id,
        }));
      } else if (selectedItem.type === 'playlist') {
        collectionName = selectedItem.title;
        const playlistDetails = await getPlaylistDetails(selectedItem.id);
        tracksData = playlistDetails.tracks;
      }

      if (tracksData.length > 0) {
        // Create local playlist matching collection name
        const playlists = await getLocalPlaylists();
        let playlist = playlists.find(p => p.name.toLowerCase() === collectionName.toLowerCase());
        if (!playlist) {
          playlist = await createLocalPlaylist(collectionName);
        }

        toast.info(`Queued ${tracksData.length} downloads...`);
        for (const track of tracksData) {
          startDownload(track);
          if (playlist) {
            await addTrackToLocalPlaylist(playlist.id, track);
          }
        }
      } else {
        toast.info('No tracks found to download');
      }
    } catch (e) {
      console.warn('Download collection error', e);
      toast.error('Failed to download collection');
    }
  };

  const handleSaveAlbumToLibrary = async () => {
    if (!selectedItem || selectedItem.type !== 'album') return;
    setVisible(false);
    toast.info('Saving album to library...');
    try {
      const albumDetails = await getAlbumDetails(selectedItem.id);
      const tracksData = (albumDetails.tracks || []).map((t: any) => ({
        id: t.videoId,
        title: t.name,
        artist: selectedItem.artist || 'Unknown Artist',
        album: selectedItem.title,
        artwork: selectedItem.artwork || '',
        duration: t.duration / 1000,
        url: `https://dummy.com/track-${t.videoId}.mp3`,
        artistId: selectedItem.artistId,
        albumId: selectedItem.id,
      }));

      if (tracksData.length > 0) {
        for (const track of tracksData) {
          await addFavorite(track);
        }
        toast.success(`Saved all ${tracksData.length} tracks to library`);
      } else {
        toast.info('No tracks found');
      }
    } catch (e) {
      console.warn('Save album error', e);
      toast.error('Failed to save album');
    }
  };

  const handleAddCollectionToPlaylist = async (playlistId: string) => {
    if (!selectedItem) return;
    setVisible(false);
    toast.info('Adding tracks to playlist...');
    try {
      let tracksData: AppTrack[] = [];
      if (selectedItem.type === 'album') {
        const albumDetails = await getAlbumDetails(selectedItem.id);
        tracksData = (albumDetails.tracks || []).map((t: any) => ({
          id: t.videoId,
          title: t.name,
          artist: selectedItem.artist || 'Unknown Artist',
          album: selectedItem.title,
          artwork: selectedItem.artwork || '',
          duration: t.duration / 1000,
          url: `https://dummy.com/track-${t.videoId}.mp3`,
          artistId: selectedItem.artistId,
          albumId: selectedItem.id,
        }));
      } else if (selectedItem.type === 'playlist') {
        const playlistDetails = await getPlaylistDetails(selectedItem.id);
        tracksData = playlistDetails.tracks;
      }

      if (tracksData.length > 0) {
        let addedCount = 0;
        for (const track of tracksData) {
          const success = await addTrackToPlaylist(playlistId, track);
          if (success) addedCount++;
        }
        toast.success(`Added ${addedCount} tracks to playlist`);
      } else {
        toast.info('No tracks found');
      }
    } catch (e) {
      console.warn('Add collection to playlist error', e);
      toast.error('Failed to add to playlist');
    }
  };

  const handleShareCollection = async () => {
    if (!selectedItem) return;
    setVisible(false);
    try {
      let shareUrl = '';
      if (selectedItem.type === 'album') {
        shareUrl = `https://music.youtube.com/playlist?list=${selectedItem.id}`;
      } else if (selectedItem.type === 'playlist') {
        shareUrl = `https://music.youtube.com/playlist?list=${selectedItem.id}`;
      } else if (selectedItem.type === 'artist') {
        shareUrl = `https://music.youtube.com/channel/${selectedItem.id}`;
      }
      
      if (shareUrl) {
        await Share.share({
          message: `Check out this ${selectedItem.type} "${selectedItem.title}": ${shareUrl}`,
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleGoToArtistFromCollection = () => {
    if (!selectedItem) return;
    setVisible(false);
    if (selectedItem.artistId) {
      DeviceEventEmitter.emit('collapse-player-modal');
      router.push(`/artist/${selectedItem.artistId}` as any);
    }
  };

  return {
    handlePlayNextCollection,
    handleAddToQueueCollection,
    handleDownloadCollection,
    handleSaveAlbumToLibrary,
    handleAddCollectionToPlaylist,
    handleShareCollection,
    handleGoToArtistFromCollection,
  };
}
export type CollectionActionsState = ReturnType<typeof useCollectionActions>;
