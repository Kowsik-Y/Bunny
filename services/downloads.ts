import AsyncStorage from '@react-native-async-storage/async-storage';
import { documentDirectory, cacheDirectory, createDownloadResumable, getInfoAsync, deleteAsync } from 'expo-file-system/legacy';
import { resolveAudio } from './useYouTubeAudio';
import { type AppTrack } from '@/components/player/Tracks';
import { DeviceEventEmitter, Platform } from 'react-native';
import { toast } from './toast';
import { useState, useEffect, useCallback } from 'react';
import Innertube from '@/modules/innertube';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function requestNotificationPermission() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

async function showSystemNotification(title: string, body: string, id?: string) {
  try {
    await requestNotificationPermission();
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to trigger system notification', e);
  }
}

const lastLoggedPct: Record<string, number> = {};

let totalDownloadCount = 0;
let currentDownloadIndex = 0;

function progressBarString(progress: number, length: number = 10): string {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const filledLength = Math.round(clampedProgress * length);
  const emptyLength = length - filledLength;
  const filled = '█'.repeat(Math.max(0, filledLength));
  const empty = '░'.repeat(Math.max(0, emptyLength));
  return `[${filled}${empty}]`;
}

async function showProgressNotification(trackId: string, title: string, progress: number) {
  const pct = Math.round(progress * 100);
  const rounded = Math.floor(pct / 10) * 10;
  
  if (lastLoggedPct[trackId] === rounded) {
    return;
  }
  
  lastLoggedPct[trackId] = rounded;

  try {
    await requestNotificationPermission();
    const progressText = progressBarString(progress);
    const songInfo = totalDownloadCount > 1 ? ` (${currentDownloadIndex} of ${totalDownloadCount})` : '';
    await Notifications.scheduleNotificationAsync({
      identifier: `download-${trackId}`,
      content: {
        title: `Downloading Track${songInfo}`,
        body: `${progressText} ${pct}% - "${title}"`,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to update system progress notification', e);
  }
}

async function updateDownloadNotification(
  type: 'progress' | 'complete' | 'paused' | 'cancelled' | 'failed',
  trackId: string,
  title: string,
  progress: number = 0,
  reason: string = ''
) {
  const notificationId = `download-${trackId}`;
  if (Platform.OS === 'android') {
    try {
      switch (type) {
        case 'progress':
          await Innertube.showDownloadProgressNotification(notificationId, title, progress, totalDownloadCount, currentDownloadIndex);
          break;
        case 'complete':
          await Innertube.showDownloadCompleteNotification(notificationId, title);
          break;
        case 'paused':
          await Innertube.showDownloadPausedNotification(notificationId, title);
          break;
        case 'cancelled':
          await Innertube.showDownloadCancelledNotification(notificationId);
          break;
        case 'failed':
          await Innertube.showDownloadFailedNotification(notificationId, title, reason);
          break;
      }
      return;
    } catch (err) {
      console.warn('Failed to show native Android download notification, falling back to expo-notifications', err);
    }
  }

  // Fallback / iOS implementation using expo-notifications
  const songInfo = totalDownloadCount > 1 ? ` (${currentDownloadIndex} of ${totalDownloadCount})` : '';
  switch (type) {
    case 'progress':
      await showProgressNotification(trackId, title, progress);
      break;
    case 'complete':
      await showSystemNotification('Download Complete', `"${title}" has been saved offline.`, notificationId);
      break;
    case 'paused':
      await showSystemNotification('Download Paused', `Download for "${title}" is paused.`, notificationId);
      break;
    case 'cancelled':
      await showSystemNotification('Download Cancelled', 'The media download was cancelled.', notificationId);
      break;
    case 'failed':
      await showSystemNotification('Download Failed', `An error occurred while downloading "${title}". ${reason}`, notificationId);
      break;
  }
}

const DOWNLOADS_KEY = '@bunny_downloads';
const DOWNLOAD_LOCATION_KEY = '@bunny_download_location';
const DOWNLOADS_UPDATED_EVENT = 'downloads_updated';

export interface DownloadedTrack {
  track: AppTrack;
  localUri: string;
  downloadedAt: string;
}

// Global active download task registry
const activeResumables: Record<string, any> = {};
const pausedStates: Record<string, any> = {};
const pausedDownloadingIds: Record<string, boolean> = {};
const activeDownloadingIds: Record<string, number> = {};
const activeDownloadingTracks: Record<string, AppTrack> = {};

// Queue of tracks to be downloaded
const downloadQueue: AppTrack[] = [];
const queuedDownloadingTracks: Record<string, AppTrack> = {};
let isProcessingQueue = false;

export async function getDownloadedTracks(): Promise<DownloadedTrack[]> {
  try {
    const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return data ? JSON.parse(data) : [];
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

export function enqueueTrack(track: AppTrack) {
  if (queuedDownloadingTracks[track.id] || activeDownloadingTracks[track.id]) {
    return;
  }
  
  queuedDownloadingTracks[track.id] = track;
  downloadQueue.push(track);
  
  if (isProcessingQueue) {
    totalDownloadCount++;
  }
  
  DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
  
  if (!isProcessingQueue) {
    processQueue();
  }
}

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;
  
  totalDownloadCount = downloadQueue.length;
  currentDownloadIndex = 0;
  
  while (downloadQueue.length > 0) {
    const nextTrack = downloadQueue[0];
    if (!nextTrack) {
      downloadQueue.shift();
      continue;
    }
    
    // Check if it was cancelled while in queue
    if (!queuedDownloadingTracks[nextTrack.id]) {
      downloadQueue.shift();
      continue;
    }
    
    // Move from queue to active
    delete queuedDownloadingTracks[nextTrack.id];
    activeDownloadingTracks[nextTrack.id] = nextTrack;
    activeDownloadingIds[nextTrack.id] = 0;
    
    currentDownloadIndex++;
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
    
    try {
      await downloadTrack(nextTrack, (progress) => {
        activeDownloadingIds[nextTrack.id] = progress;
        DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
      });
    } catch (err) {
      console.warn('Queue download failed for track', nextTrack.id, err);
    } finally {
      delete activeDownloadingIds[nextTrack.id];
      delete activeDownloadingTracks[nextTrack.id];
      downloadQueue.shift();
      DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
    }
  }
  
  isProcessingQueue = false;
  totalDownloadCount = 0;
  currentDownloadIndex = 0;
  DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
}

export async function downloadTrack(track: AppTrack, onProgress?: (progress: number) => void): Promise<boolean> {
  try {
    const existing = await getLocalDownloadUri(track.id);
    if (existing) return true;

    await updateDownloadNotification('progress', track.id, track.title, 0.0);

    const videoId = track.id.startsWith('yt-') ? track.id.substring(3) : track.id;
    const resolved = await resolveAudio(videoId);
    if (!resolved || !resolved.track || !resolved.track.url) {
      console.warn('Failed to resolve audio URL for download');
      await updateDownloadNotification('failed', track.id, track.title, 0, 'Could not resolve stream URL.');
      delete lastLoggedPct[track.id];
      return false;
    }

    const activeDir = await getActiveDirectory();
    const fileExtension = '.m4a';
    const filename = `${track.id}${fileExtension}`;
    const localUri = `${activeDir}${filename}`;

    const downloadResumable = createDownloadResumable(
      resolved.track.url,
      localUri,
      resolved.track.headers ? { headers: resolved.track.headers } : {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) onProgress(progress);
        updateDownloadNotification('progress', track.id, track.title, progress);
      },
      pausedStates[track.id]
    );

    activeResumables[track.id] = downloadResumable;
    delete pausedDownloadingIds[track.id];
    delete pausedStates[track.id];
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);

    const result = await downloadResumable.downloadAsync();
    
    if (!result || !result.uri) {
      if (pausedDownloadingIds[track.id]) {
        return false;
      }
      console.warn('Download failed or returned empty URI');
      await updateDownloadNotification('failed', track.id, track.title, 0, 'Failed to write to disk.');
      
      // If notification is disabled, show toast immediately
      try {
        const settings = await Notifications.getPermissionsAsync();
        if (!settings.granted) {
          toast.error(`Failed to download "${track.title}"`);
        }
      } catch (_) {}

      delete lastLoggedPct[track.id];
      delete activeResumables[track.id];
      return false;
    }

    const downloads = await getDownloadedTracks();
    const newDownload: DownloadedTrack = {
      track,
      localUri: result.uri,
      downloadedAt: new Date().toISOString(),
    };
    downloads.push(newDownload);
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
    
    delete activeResumables[track.id];
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
    await updateDownloadNotification('complete', track.id, track.title);
    
    // If notification is disabled, show toast immediately
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        toast.success(`Downloaded "${track.title}"`);
      }
    } catch (_) {}

    delete lastLoggedPct[track.id];
    return true;
  } catch (e) {
    console.error('Failed to download track:', e);
    
    // If notification is disabled, show toast immediately on error catch
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        toast.error(`Failed to download "${track.title}"`);
      }
    } catch (_) {}

    if (activeResumables[track.id] === undefined && pausedDownloadingIds[track.id] === undefined) {
      return false;
    }
    await updateDownloadNotification('failed', track.id, track.title, 0, e instanceof Error ? e.message : 'An error occurred.');
    delete lastLoggedPct[track.id];
    delete activeResumables[track.id];
    return false;
  }
}

export async function pauseDownload(trackId: string): Promise<void> {
  const resumable = activeResumables[trackId];
  if (resumable) {
    try {
      const pauseResult = await resumable.pauseAsync();
      pausedStates[trackId] = pauseResult;
      pausedDownloadingIds[trackId] = true;
      DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
      const trackTitle = activeDownloadingTracks[trackId]?.title || 'track';
      await updateDownloadNotification('paused', trackId, trackTitle);
    } catch (e) {
      console.warn('Failed to pause download:', e);
    }
  }
}

export async function cancelDownload(trackId: string): Promise<void> {
  const resumable = activeResumables[trackId];
  const isActive = resumable !== undefined;
  if (resumable) {
    try {
      await resumable.cancelAsync();
    } catch (e) {
      console.warn('Failed to cancel active download:', e);
    }
  }
  
  // Remove from queue
  delete queuedDownloadingTracks[trackId];
  const idx = downloadQueue.findIndex(t => t.id === trackId);
  if (idx >= 0) {
    if (!isActive) {
      downloadQueue.splice(idx, 1);
      if (isProcessingQueue) {
        totalDownloadCount = Math.max(0, totalDownloadCount - 1);
      }
    }
  }

  delete activeResumables[trackId];
  delete pausedStates[trackId];
  delete pausedDownloadingIds[trackId];
  delete activeDownloadingIds[trackId];
  delete activeDownloadingTracks[trackId];
  delete lastLoggedPct[trackId];
  DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
  await updateDownloadNotification('cancelled', trackId, '');
}

export async function deleteDownload(trackId: string): Promise<void> {
  try {
    const downloads = await getDownloadedTracks();
    const found = downloads.find((d) => String(d.track.id) === String(trackId));
    if (!found) return;

    try {
      await deleteAsync(found.localUri, { idempotent: true });
    } catch (err) {
      console.warn('Failed to delete file from disk', err);
    }

    const filtered = downloads.filter((d) => String(d.track.id) !== String(trackId));
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(filtered));
    
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
  } catch (e) {
    console.error('Failed to delete download', e);
  }
}

export async function clearAllDownloads(): Promise<void> {
  try {
    const downloads = await getDownloadedTracks();
    for (const d of downloads) {
      try {
        await deleteAsync(d.localUri, { idempotent: true });
      } catch (err) {
        console.warn('Failed to delete file', d.localUri, err);
      }
    }
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify([]));
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
  } catch (e) {
    console.error('Failed to clear all downloads', e);
  }
}

export function useDownloads() {
  const [downloadedTracks, setDownloadedTracks] = useState<DownloadedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<Record<string, number>>({});
  const [downloadingTracks, setDownloadingTracks] = useState<Record<string, AppTrack>>({});
  const [pausedDownloadingIdsState, setPausedDownloadingIdsState] = useState<Record<string, boolean>>({});
  const [downloadLocation, setDownloadLocationState] = useState<'internal' | 'cache'>('internal');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getDownloadedTracks();
    setDownloadedTracks(list);
    const loc = await getDownloadLocation();
    setDownloadLocationState(loc);
    
    const mergedTracks = { ...activeDownloadingTracks, ...queuedDownloadingTracks };
    const mergedIds = { ...activeDownloadingIds };
    Object.keys(queuedDownloadingTracks).forEach(id => {
      if (mergedIds[id] === undefined) {
        mergedIds[id] = 0;
      }
    });

    setDownloadingIds(mergedIds);
    setDownloadingTracks(mergedTracks);
    setPausedDownloadingIdsState({ ...pausedDownloadingIds });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(DOWNLOADS_UPDATED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const startDownload = async (track: AppTrack) => {
    const existing = downloadedTracks.some((d) => String(d.track.id) === String(track.id));
    if (existing) return true;
    
    // If notification is disabled, show toast immediately on download click
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        toast.info(`Downloading "${track.title}"...`);
      }
    } catch (_) {}

    enqueueTrack(track);
    return true;
  };

  const removeDownload = async (trackId: string) => {
    await deleteDownload(trackId);
  };

  const pause = async (trackId: string) => {
    await pauseDownload(trackId);
  };

  const cancel = async (trackId: string) => {
    await cancelDownload(trackId);
  };

  const changeDownloadLocation = async (loc: 'internal' | 'cache') => {
    await setDownloadLocation(loc);
    setDownloadLocationState(loc);
  };

  const clearDownloads = async () => {
    await clearAllDownloads();
  };

  const isDownloaded = useCallback((trackId: string) => {
    return downloadedTracks.some((d) => String(d.track.id) === String(trackId));
  }, [downloadedTracks]);

  return {
    downloadedTracks,
    loading,
    downloadingIds,
    downloadingTracks,
    pausedDownloadingIds: pausedDownloadingIdsState,
    startDownload,
    removeDownload,
    pauseDownload: pause,
    cancelDownload: cancel,
    downloadLocation,
    changeDownloadLocation,
    clearDownloads,
    isDownloaded,
    refreshDownloads: load,
  };
}
