import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { type AppTrack } from '@/components/player/Tracks';
import tracks from '@/components/player/Tracks';
import { FAVORITES_KEY, FAVORITES_UPDATED_EVENT } from './constants';

export function useFavorites() {
  const [favorites, setFavorites] = useState<AppTrack[]>([]);

  const loadFavorites = async () => {
    try {
      const data = await AsyncStorage.getItem(FAVORITES_KEY);
      if (data) {
        setFavorites(JSON.parse(data));
      } else {
        const seed = tracks.slice(0, 3);
        await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(seed));
        setFavorites(seed);
      }
    } catch (e) {
      console.error('Failed to load favorites', e);
    }
  };

  useEffect(() => {
    loadFavorites();
    const subscription = DeviceEventEmitter.addListener(FAVORITES_UPDATED_EVENT, loadFavorites);
    return () => subscription.remove();
  }, []);

  const addFavorite = async (track: AppTrack) => {
    try {
      const filtered = favorites.filter(t => String(t.id) !== String(track.id));
      const updated = [...filtered, track];
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      setFavorites(updated);
      DeviceEventEmitter.emit(FAVORITES_UPDATED_EVENT);
    } catch (e) {
      console.error('Failed to add favorite', e);
    }
  };

  const removeFavorite = async (trackId: string) => {
    try {
      const updated = favorites.filter(t => String(t.id) !== String(trackId));
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      setFavorites(updated);
      DeviceEventEmitter.emit(FAVORITES_UPDATED_EVENT);
    } catch (e) {
      console.error('Failed to remove favorite', e);
    }
  };

  const isFavorite = (trackId: string) => {
    return favorites.some(t => String(t.id) === String(trackId));
  };

  const toggleFavorite = async (track: AppTrack) => {
    if (isFavorite(track.id)) {
      await removeFavorite(track.id);
    } else {
      await addFavorite(track);
    }
  };

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    refreshFavorites: loadFavorites,
  };
}
