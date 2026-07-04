import TrackPlayer from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';

export let _setupPromise: Promise<void> | null = null;
export let _isReady = false;

export function setIsReady(val: boolean) {
  _isReady = val;
}

export function setSetupPromise(p: Promise<void> | null) {
  _setupPromise = p;
}

export async function savePlayerQueue() {
  try {
    const queue = await TrackPlayer.getQueue();
    await AsyncStorage.setItem('player-persisted-queue', JSON.stringify(queue));
  } catch (e) {
    console.warn('[SetupService] Failed to save player queue:', e);
  }
}

export async function savePlayerActiveTrack(index: number) {
  try {
    await AsyncStorage.setItem('player-persisted-index', String(index));
  } catch (e) {
    console.warn('[SetupService] Failed to save player active index:', e);
  }
}

export async function savePlayerPosition(position: number) {
  try {
    await AsyncStorage.setItem('player-persisted-position', String(position));
  } catch (e) {
    // Silently fail
  }
}
