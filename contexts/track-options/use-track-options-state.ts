import { useState } from 'react';
import { useRouter } from 'expo-router';
import { type AppTrack } from '@/components/player/Tracks';
import { useFavorites, useDownloads, usePlaylists, useQueue, usePinnedTracks } from '@/services';
import { SelectedItemState } from './types';
import { useTrackActions } from './hooks/use-track-actions';
import { useCollectionActions } from './hooks/use-collection-actions';
import { usePlaylistActions } from './hooks/use-playlist-actions';

export function useTrackOptionsState() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<AppTrack | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItemState | null>(null);

  const { toggleFavorite, isFavorite, addFavorite } = useFavorites();
  const { startDownload, isDownloaded, downloadingIds, removeDownload } = useDownloads();
  const { playlists, addTrackToPlaylist, createPlaylist } = usePlaylists();
  const queue = useQueue();
  const { isTrackPinned } = usePinnedTracks();

  const isInQueue = selectedTrack ? queue.some(t => String(t.id) === String(selectedTrack.id)) : false;

  const [sheetScreen, setSheetScreen] = useState<'main' | 'playlists' | 'stats'>('main');
  const [creditsVisible, setCreditsVisible] = useState(false);
  const [newPlaylistVisible, setNewPlaylistVisible] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showArtistSheet, setShowArtistSheet] = useState(false);
  const [artistOptions, setArtistOptions] = useState<{ name: string; id: string }[]>([]);
  const [dismissQueueVisible, setDismissQueueVisible] = useState(false);

  const openTrackOptions = (track: AppTrack) => {
    setSelectedTrack(track);
    setSelectedItem({
      type: 'track',
      id: track.id,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      artistId: track.artistId,
      albumId: track.albumId,
    });
    setSheetScreen('main');
    setVisible(true);
  };

  const openAlbumOptions = (album: any) => {
    setSelectedItem({
      type: 'album',
      id: album.id,
      title: album.title,
      artist: album.artist,
      artwork: album.artwork,
      artistId: album.artistId,
    });
    setSheetScreen('main');
    setVisible(true);
  };

  const openPlaylistOptions = (playlist: any) => {
    setSelectedItem({
      type: 'playlist',
      id: playlist.id,
      title: playlist.name,
      artist: playlist.songCount !== undefined ? `${playlist.songCount} songs` : 'Playlist',
      artwork: playlist.artwork,
    });
    setSheetScreen('main');
    setVisible(true);
  };

  const openArtistOptions = (artist: any) => {
    setSelectedItem({
      type: 'artist',
      id: artist.id,
      title: artist.name,
      artwork: artist.artwork,
    });
    setSheetScreen('main');
    setVisible(true);
  };

  const trackActions = useTrackActions({
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
    selectedItem,
  });

  const collectionActions = useCollectionActions({
    selectedItem,
    setVisible,
    startDownload,
    addFavorite,
    addTrackToPlaylist,
  });

  const playlistActions = usePlaylistActions({
    selectedTrack,
    setVisible,
    setNewPlaylistName,
    setNewPlaylistVisible,
    newPlaylistName,
    createPlaylist,
    addTrackToPlaylist,
  });

  return {
    router,
    visible,
    setVisible,
    selectedTrack,
    setSelectedTrack,
    selectedItem,
    setSelectedItem,
    isFavorite,
    isDownloaded,
    downloadingIds,
    playlists,
    isInQueue,
    isTrackPinned,
    sheetScreen,
    setSheetScreen,
    creditsVisible,
    setCreditsVisible,
    newPlaylistVisible,
    setNewPlaylistVisible,
    newPlaylistName,
    setNewPlaylistName,
    showArtistSheet,
    setShowArtistSheet,
    artistOptions,
    dismissQueueVisible,
    setDismissQueueVisible,
    openTrackOptions,
    openAlbumOptions,
    openPlaylistOptions,
    openArtistOptions,
    ...trackActions,
    ...collectionActions,
    ...playlistActions,
  };
}
export type TrackOptionsState = ReturnType<typeof useTrackOptionsState>;
