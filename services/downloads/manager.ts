import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDownloadResumable, deleteAsync } from 'expo-file-system/legacy';
import { DeviceEventEmitter } from 'react-native';
import * as Notifications from 'expo-notifications';
import { resolveAudio } from '../useYouTubeAudio';
import { type AppTrack } from '@/components/player/Tracks';
import { toast } from '../toast';
import { DownloadedTrack } from './types';
import {
  activeResumables,
  pausedStates,
  pausedDownloadingIds,
  activeDownloadingIds,
  activeDownloadingTracks,
  downloadQueue,
  queuedDownloadingTracks,
  progressState,
  DOWNLOADS_UPDATED_EVENT,
  DOWNLOADS_KEY,
} from './state';
import { updateDownloadNotification, clearLoggedPct } from './notifications';
import { getDownloadedTracks, getLocalDownloadUri, getActiveDirectory } from './storage';

export function enqueueTrack(track: AppTrack) {
  if (queuedDownloadingTracks[track.id] || activeDownloadingTracks[track.id]) {
    return;
  }
  
  queuedDownloadingTracks[track.id] = track;
  downloadQueue.push(track);
  
  if (progressState.isProcessingQueue) {
    progressState.totalDownloadCount++;
  }
  
  DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
  
  if (!progressState.isProcessingQueue) {
    processQueue();
  }
}

async function processQueue() {
  if (progressState.isProcessingQueue) return;
  progressState.isProcessingQueue = true;
  
  progressState.totalDownloadCount = downloadQueue.length;
  progressState.currentDownloadIndex = 0;
  
  while (downloadQueue.length > 0) {
    const nextTrack = downloadQueue[0];
    if (!nextTrack) {
      downloadQueue.shift();
      continue;
    }
    
    if (!queuedDownloadingTracks[nextTrack.id]) {
      downloadQueue.shift();
      continue;
    }
    
    delete queuedDownloadingTracks[nextTrack.id];
    activeDownloadingTracks[nextTrack.id] = nextTrack;
    activeDownloadingIds[nextTrack.id] = 0;
    
    progressState.currentDownloadIndex++;
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
  
  progressState.isProcessingQueue = false;
  progressState.totalDownloadCount = 0;
  progressState.currentDownloadIndex = 0;
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
      clearLoggedPct(track.id);
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
      
      try {
        const settings = await Notifications.getPermissionsAsync();
        if (!settings.granted) {
          toast.error(`Failed to download "${track.title}"`);
        }
      } catch (_) {}

      clearLoggedPct(track.id);
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
    
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        toast.success(`Downloaded "${track.title}"`);
      }
    } catch (_) {}

    clearLoggedPct(track.id);
    return true;
  } catch (e) {
    console.error('Failed to download track:', e);
    
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
    clearLoggedPct(track.id);
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
  
  delete queuedDownloadingTracks[trackId];
  const idx = downloadQueue.findIndex(t => t.id === trackId);
  if (idx >= 0) {
    if (!isActive) {
      downloadQueue.splice(idx, 1);
      progressState.totalDownloadCount = Math.max(0, progressState.totalDownloadCount - 1);
    }
  }

  delete activeResumables[trackId];
  delete pausedStates[trackId];
  delete pausedDownloadingIds[trackId];
  delete activeDownloadingIds[trackId];
  delete activeDownloadingTracks[trackId];
  clearLoggedPct(trackId);
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
