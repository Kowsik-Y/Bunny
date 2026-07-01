import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AppTrack } from '@/components/player/Tracks';
import { DeviceEventEmitter } from 'react-native';

const PLAYLISTS_KEY = '@bunny_playlists';
const PLAYLISTS_UPDATED_EVENT = 'playlists_updated';

export interface LocalPlaylist {
  id: string;
  name: string;
  tracks: AppTrack[];
  createdAt: string;
}

export async function getLocalPlaylists(): Promise<LocalPlaylist[]> {
  try {
    const data = await AsyncStorage.getItem(PLAYLISTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load playlists', e);
    return [];
  }
}

export async function saveLocalPlaylists(playlists: LocalPlaylist[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    DeviceEventEmitter.emit(PLAYLISTS_UPDATED_EVENT);
  } catch (e) {
    console.error('Failed to save playlists', e);
  }
}

export async function createLocalPlaylist(name: string): Promise<LocalPlaylist> {
  const playlists = await getLocalPlaylists();
  const newPlaylist: LocalPlaylist = {
    id: `local-${Date.now()}`,
    name,
    tracks: [],
    createdAt: new Date().toISOString(),
  };
  playlists.push(newPlaylist);
  await saveLocalPlaylists(playlists);
  return newPlaylist;
}

export async function deleteLocalPlaylist(id: string): Promise<void> {
  const playlists = await getLocalPlaylists();
  const filtered = playlists.filter((p) => p.id !== id);
  await saveLocalPlaylists(filtered);
}

export async function addTrackToLocalPlaylist(playlistId: string, track: AppTrack): Promise<boolean> {
  const playlists = await getLocalPlaylists();
  const playlist = playlists.find((p) => p.id === playlistId);
  if (!playlist) return false;
  
  const alreadyExists = playlist.tracks.some((t) => String(t.id) === String(track.id));
  if (alreadyExists) return false;

  playlist.tracks.push(track);
  await saveLocalPlaylists(playlists);
  return true;
}

export async function removeTrackFromLocalPlaylist(playlistId: string, trackId: string): Promise<void> {
  const playlists = await getLocalPlaylists();
  const playlist = playlists.find((p) => p.id === playlistId);
  if (!playlist) return;

  playlist.tracks = playlist.tracks.filter((t) => String(t.id) !== String(trackId));
  await saveLocalPlaylists(playlists);
}

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
