import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { type AppTrack } from '@/components/player/Tracks';
import { LocalPlaylist } from './types';
import { PLAYLISTS_KEY, PLAYLISTS_UPDATED_EVENT } from './constants';

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
