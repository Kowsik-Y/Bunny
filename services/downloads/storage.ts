import AsyncStorage from '@react-native-async-storage/async-storage';
import { documentDirectory, cacheDirectory, getInfoAsync } from 'expo-file-system/legacy';
import { DeviceEventEmitter } from 'react-native';
import { DOWNLOADS_KEY, DOWNLOAD_LOCATION_KEY, DOWNLOADS_UPDATED_EVENT, CONCURRENT_LIMIT_KEY } from './state';
import { DownloadedTrack } from './types';

export async function getDownloadedTracks(): Promise<DownloadedTrack[]> {
  try {
    const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
    const list = data ? (JSON.parse(data) as DownloadedTrack[]) : [];
    
    let needsUpdate = false;
    for (const d of list) {
      if (d.size === undefined) {
        try {
          const info = await getInfoAsync(d.localUri);
          if (info.exists) {
            d.size = info.size;
            needsUpdate = true;
          }
        } catch (_) {}
      }
      if (d.hasLrc === undefined) {
        try {
          const activeDir = d.localUri.substring(0, d.localUri.lastIndexOf('/') + 1);
          const lrcUri = `${activeDir}${d.track.id}.lrc`;
          const info = await getInfoAsync(lrcUri);
          d.hasLrc = info.exists;
          needsUpdate = true;
        } catch (_) {
          d.hasLrc = false;
          needsUpdate = true;
        }
      }
    }
    
    if (needsUpdate) {
      await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(list));
    }
    
    return list;
  } catch (e) {
    console.error('Failed to load downloads list', e);
    return [];
  }
}

export async function getDownloadLocation(): Promise<'internal' | 'cache'> {
  try {
    const loc = await AsyncStorage.getItem(DOWNLOAD_LOCATION_KEY);
    return loc === 'cache' ? 'cache' : 'internal';
  } catch {
    return 'internal';
  }
}

export async function setDownloadLocation(loc: 'internal' | 'cache'): Promise<void> {
  try {
    await AsyncStorage.setItem(DOWNLOAD_LOCATION_KEY, loc);
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
  } catch (e) {
    console.error('Failed to save download location preference', e);
  }
}

export async function getActiveDirectory(): Promise<string> {
  const loc = await getDownloadLocation();
  const dir = loc === 'cache' ? cacheDirectory : documentDirectory;
  return dir || documentDirectory || '';
}

export async function getLocalDownloadUri(trackId: string): Promise<string | null> {
  const downloads = await getDownloadedTracks();
  const found = downloads.find((d) => String(d.track.id) === String(trackId));
  if (!found) return null;
  
  try {
    const info = await getInfoAsync(found.localUri);
    return info.exists ? found.localUri : null;
  } catch {
    return null;
  }
}

export async function getConcurrentLimit(): Promise<number> {
  try {
    const limit = await AsyncStorage.getItem(CONCURRENT_LIMIT_KEY);
    return limit ? parseInt(limit, 10) : 3;
  } catch {
    return 3;
  }
}

export async function setConcurrentLimit(limit: number): Promise<void> {
  try {
    await AsyncStorage.setItem(CONCURRENT_LIMIT_KEY, String(limit));
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
  } catch (e) {
    console.error('Failed to save concurrent limit', e);
  }
}
