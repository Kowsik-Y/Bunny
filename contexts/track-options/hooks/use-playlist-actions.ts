import { type AppTrack } from '@/components/player/Tracks';
import { toast } from '@/services';
import { LocalPlaylist } from '@/services/playlists';

interface PlaylistActionsParams {
  selectedTrack: AppTrack | null;
  setVisible: (visible: boolean) => void;
  setNewPlaylistName: (name: string) => void;
  setNewPlaylistVisible: (visible: boolean) => void;
  newPlaylistName: string;
  createPlaylist: (name: string) => Promise<LocalPlaylist>;
  addTrackToPlaylist: (playlistId: string, track: AppTrack) => Promise<boolean>;
}

export function usePlaylistActions({
  selectedTrack,
  setVisible,
  setNewPlaylistName,
  setNewPlaylistVisible,
  newPlaylistName,
  createPlaylist,
  addTrackToPlaylist,
}: PlaylistActionsParams) {
  const handleAddToPlaylist = async (playlistId: string) => {
    if (!selectedTrack) return;
    const success = await addTrackToPlaylist(playlistId, selectedTrack);
    toast.success(success ? 'Added to playlist' : 'Already in playlist');
    setVisible(false);
  };

  const handleCreateNewPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const newPl = await createPlaylist(newPlaylistName.trim());
    if (selectedTrack) {
      await addTrackToPlaylist(newPl.id, selectedTrack);
    }
    setNewPlaylistName('');
    setNewPlaylistVisible(false);
    toast.success('Created playlist and added song');
    setVisible(false);
  };

  return {
    handleAddToPlaylist,
    handleCreateNewPlaylist,
  };
}
