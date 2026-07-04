import { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { type AppTrack } from '@/components/player/Tracks';
import { LocalPlaylist } from './types';
import { PLAYLISTS_UPDATED_EVENT } from './constants';
import {
  getLocalPlaylists,
  createLocalPlaylist,
  deleteLocalPlaylist,
  addTrackToLocalPlaylist,
  removeTrackFromLocalPlaylist,
} from './storage';

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<LocalPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getLocalPlaylists();
    setPlaylists(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const subscription = DeviceEventEmitter.addListener(PLAYLISTS_UPDATED_EVENT, load);
    return () => subscription.remove();
  }, [load]);

  const create = async (name: string) => {
    const res = await createLocalPlaylist(name);
    return res;
  };

  const remove = async (id: string) => {
    await deleteLocalPlaylist(id);
  };

  const addTrack = async (playlistId: string, track: AppTrack) => {
    const success = await addTrackToLocalPlaylist(playlistId, track);
    return success;
  };

  const removeTrack = async (playlistId: string, trackId: string) => {
    await removeTrackFromLocalPlaylist(playlistId, trackId);
  };

  return {
    playlists,
    loading,
    createPlaylist: create,
    deletePlaylist: remove,
    addTrackToPlaylist: addTrack,
    removeTrackFromPlaylist: removeTrack,
    refreshPlaylists: load,
  };
}
