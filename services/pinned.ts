import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

export interface PinnedItem {
  id: string;
  type: 'track' | 'album' | 'artist' | 'playlist';
  title: string;
  artist?: string;
  artwork?: string;
  duration?: number;
  artistId?: string;
  albumId?: string;
}

export const PINNED_ITEMS_KEY = 'pinned_items_v2';
export const PINNED_ITEMS_UPDATED_EVENT = 'pinned_items_updated';

export function usePinnedTracks() {
  const [pinnedTracks, setPinnedTracks] = useState<PinnedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPinnedTracks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AsyncStorage.getItem(PINNED_ITEMS_KEY);
      if (data) {
        setPinnedTracks(JSON.parse(data));
      } else {
        const oldData = await AsyncStorage.getItem('pinned_tracks_v1');
        if (oldData) {
          const oldList = JSON.parse(oldData);
          const migrated: PinnedItem[] = oldList.map((t: any) => ({
            id: t.id,
            type: 'track',
            title: t.title,
            artist: t.artist,
            artwork: t.artwork,
            duration: t.duration,
            artistId: t.artistId,
            albumId: t.albumId,
          }));
          await AsyncStorage.setItem(PINNED_ITEMS_KEY, JSON.stringify(migrated));
          await AsyncStorage.removeItem('pinned_tracks_v1');
          setPinnedTracks(migrated);
        } else {
          setPinnedTracks([]);
        }
      }
    } catch (e) {
      console.error('Failed to load pinned items', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPinnedTracks();
    const subscription = DeviceEventEmitter.addListener(PINNED_ITEMS_UPDATED_EVENT, loadPinnedTracks);
    return () => subscription.remove();
  }, [loadPinnedTracks]);

  const pinItem = async (item: PinnedItem) => {
    try {
      const filtered = pinnedTracks.filter(t => String(t.id) !== String(item.id));
      const updated = [item, ...filtered].slice(0, 8);
      await AsyncStorage.setItem(PINNED_ITEMS_KEY, JSON.stringify(updated));
      setPinnedTracks(updated);
      DeviceEventEmitter.emit(PINNED_ITEMS_UPDATED_EVENT);
    } catch (e) {
      console.error('Failed to pin item', e);
    }
  };

  const unpinItem = async (itemId: string) => {
    try {
      const updated = pinnedTracks.filter(t => String(t.id) !== String(itemId));
      await AsyncStorage.setItem(PINNED_ITEMS_KEY, JSON.stringify(updated));
      setPinnedTracks(updated);
      DeviceEventEmitter.emit(PINNED_ITEMS_UPDATED_EVENT);
    } catch (e) {
      console.error('Failed to unpin item', e);
    }
  };

  const isTrackPinned = useCallback((itemId: string) => {
    return pinnedTracks.some(t => String(t.id) === String(itemId));
  }, [pinnedTracks]);

  const togglePinTrack = async (item: PinnedItem) => {
    if (isTrackPinned(item.id)) {
      await unpinItem(item.id);
      return false;
    } else {
      await pinItem(item);
      return true;
    }
  };

  return {
    pinnedTracks,
    loading,
    isTrackPinned,
    togglePinTrack,
    pinTrack: pinItem,
    unpinTrack: unpinItem,
    refreshPinnedTracks: loadPinnedTracks,
  };
}
