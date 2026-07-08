import { type AppTrack } from '@/components/player/Tracks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireNativeModule } from 'expo';
import { createDownloadResumable, deleteAsync, EncodingType, getInfoAsync, readAsStringAsync, StorageAccessFramework, writeAsStringAsync, downloadAsync, copyAsync, cacheDirectory } from 'expo-file-system/legacy';
import ReactNativeBlobUtil from 'react-native-blob-util';
import * as Notifications from 'expo-notifications';
import { DeviceEventEmitter, Platform } from 'react-native';
import { fetchLyricsFromApis } from '../lyrics';
import {
  addTrackToLocalPlaylist,
  createLocalPlaylist,
  deleteLocalPlaylist,
  getLocalPlaylists,
  removeTrackFromLocalPlaylist,
} from '../playlists/storage';
import { toast } from '../toast';
import { resolveAudio } from '../useYouTubeAudio';
import { clearLoggedPct, updateDownloadNotification } from './notifications';
import {
  activeDownloadingIds,
  activeDownloadingTracks,
  activeResumables,
  downloadingSizes,
  downloadQueue,
  DOWNLOADS_KEY,
  DOWNLOADS_UPDATED_EVENT,
  pausedDownloadingIds,
  pausedDownloadingTracks,
  pausedStates,
  progressState,
  queuedDownloadingTracks,
} from './state';
import { getActiveDirectory, getConcurrentLimit, getDownloadedTracks, getLocalDownloadUri } from './storage';
import { DownloadedTrack } from './types';

if (Platform.OS === 'android') {
  try {
    const nativeModule = requireNativeModule('Innertube');
    if (nativeModule && nativeModule.clearStuckDownloadNotifications) {
      nativeModule.clearStuckDownloadNotifications();
    }
  } catch (err) {
    console.warn('Failed to clear stuck notifications on startup:', err);
  }
}
function cleanMetadata(title: string, artist: string) {
  let cleanTitle = title;
  
  // 1. Remove YouTube garbage suffixes like (Official Video), [Official Audio], etc.
  cleanTitle = cleanTitle.replace(/\s*[\(\[][^)]*(official|video|audio|lyrics|hd|4k|remastered|lyric|ft\.|feat\.)[^)]*[\)\]]/gi, '').trim();
  
  // 2. Strip artist prefix if present (e.g. "Artist - Song Name")
  const parts = cleanTitle.split(' - ');
  if (parts.length > 1) {
    const possibleArtist = parts[0].trim().toLowerCase();
    const artistLower = artist.trim().toLowerCase();
    
    // Check if there's any word overlap between possibleArtist and artistLower
    const possibleWords = possibleArtist.split(/[\s,;&+]+/).filter(w => w.length > 2);
    const artistWords = artistLower.split(/[\s,;&+]+/).filter(w => w.length > 2);
    const hasOverlap = possibleWords.some(w => artistWords.includes(w)) || 
                      artistLower.includes(possibleArtist) || 
                      possibleArtist.includes(artistLower);
                      
    if (hasOverlap) {
      cleanTitle = parts.slice(1).join(' - ').trim();
    }
  }
  
  // 3. Fallback
  if (!cleanTitle) {
    cleanTitle = title;
  }
  
  return {
    title: cleanTitle,
    artist: artist,
  };
}

const activeBytesWritten: Record<string, number> = {};
let globalTotalWritten = 0;
let speedInterval: any = null;
let lastBytesWritten = 0;
let lastSpeedCheckTime = Date.now();

function startSpeedTracking() {
  if (speedInterval) return;
  lastBytesWritten = 0;
  globalTotalWritten = 0;
  lastSpeedCheckTime = Date.now();

  speedInterval = setInterval(() => {
    const activeIds = Object.keys(activeResumables);
    if (activeIds.length === 0 && downloadQueue.length === 0) {
      progressState.downloadSpeed = 0;
      progressState.uploadSpeed = 0;
      stopSpeedTracking();
      DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
      return;
    }

    const now = Date.now();
    const timeDiff = (now - lastSpeedCheckTime) / 1000;
    if (timeDiff > 0.5) {
      const bytesDiff = Math.max(0, globalTotalWritten - lastBytesWritten);
      progressState.downloadSpeed = bytesDiff / timeDiff;
      progressState.uploadSpeed = progressState.downloadSpeed > 0
        ? Math.min(2048, progressState.downloadSpeed * 0.005)
        : 0;

      lastBytesWritten = globalTotalWritten;
      lastSpeedCheckTime = now;
      DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
    }
  }, 1000);
}

function stopSpeedTracking() {
  if (speedInterval) {
    clearInterval(speedInterval);
    speedInterval = null;
  }
}

async function handleNotificationAction(action: string, trackId: string) {
  try {
    switch (action) {
      case 'pause':
        const anyPaused = Object.keys(pausedDownloadingTracks).length > 0;
        if (anyPaused || pausedDownloadingIds[trackId]) {
          await resumeAllDownloads();
        } else {
          await pauseAllDownloads();
        }
        break;
      case 'cancel':
        await cancelDownload(trackId);
        break;
      case 'cancel_all':
        await cancelAllDownloads();
        break;
    }
  } catch (err) {
    console.error('[DownloadsManager] Failed to handle notification action:', err);
  }
}

try {
  if (Platform.OS === 'android') {
    const nativeModule = requireNativeModule('Innertube');
    nativeModule.addListener('onNotificationAction', (event: { action: string; trackId: string }) => {
      handleNotificationAction(event.action, event.trackId);
    });
  }
} catch (err) {
  console.warn('[DownloadsManager] Failed to register notification event listener:', err);
}

export function enqueueTrack(track: AppTrack) {
  delete pausedDownloadingIds[track.id];
  delete pausedDownloadingTracks[track.id];
  delete pausedStates[track.id];

  if (queuedDownloadingTracks[track.id] || activeDownloadingTracks[track.id]) {
    return;
  }

  queuedDownloadingTracks[track.id] = track;
  downloadQueue.push(track);

  if (progressState.isProcessingQueue) {
    progressState.totalDownloadCount++;
  }

  DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);

  startSpeedTracking();
  if (!progressState.isProcessingQueue) {
    processQueue();
  }
}

async function processQueue() {
  if (progressState.isProcessingQueue) {
    triggerMoreDownloads();
    return;
  }

  progressState.isProcessingQueue = true;
  progressState.totalDownloadCount = downloadQueue.length;
  progressState.currentDownloadIndex = 0;

  await triggerMoreDownloads();
}

async function triggerMoreDownloads() {
  const limit = await getConcurrentLimit();

  while (Object.keys(activeDownloadingTracks).length < limit && downloadQueue.length > 0) {
    const nextTrack = downloadQueue.shift();
    if (!nextTrack) continue;

    if (!queuedDownloadingTracks[nextTrack.id]) {
      continue;
    }

    startParallelDownload(nextTrack);
  }

  if (Object.keys(activeDownloadingTracks).length === 0 && downloadQueue.length === 0) {
    progressState.isProcessingQueue = false;
    progressState.totalDownloadCount = 0;
    progressState.currentDownloadIndex = 0;
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
  }
}

async function startParallelDownload(track: AppTrack) {
  delete queuedDownloadingTracks[track.id];
  activeDownloadingTracks[track.id] = track;
  activeDownloadingIds[track.id] = 0;

  progressState.currentDownloadIndex++;
  DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);

  try {
    await downloadTrack(track, (progress) => {
      activeDownloadingIds[track.id] = progress;
      DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
    });
  } catch (err) {
    console.warn('Queue download failed for track', track.id, err);
  } finally {
    delete activeDownloadingIds[track.id];
    delete activeDownloadingTracks[track.id];
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
    triggerMoreDownloads();
  }
}

export async function downloadTrack(track: AppTrack, onProgress?: (progress: number) => void): Promise<boolean> {
  try {
    const existing = await getLocalDownloadUri(track.id);
    if (existing) return true;

    await updateDownloadNotification('progress', track.id, track.title, 0.0);

    // Fetch download quality preference
    const videoId = track.id.startsWith('yt-') ? track.id.substring(3) : track.id;
    let preferredQuality: 'low' | 'medium' | 'high' = 'high';
    try {
      const rawPrefs = await AsyncStorage.getItem('app-theme-preferences');
      if (rawPrefs) {
        const prefs = JSON.parse(rawPrefs);
        if (prefs.downloadQuality) {
          preferredQuality = prefs.downloadQuality;
        }
      }
    } catch (e) {
      console.warn('Failed to load download quality preference:', e);
    }

    const resolved = await resolveAudio(videoId, false, preferredQuality);
    if (!resolved || !resolved.track || !resolved.track.url) {
      console.warn('Failed to resolve audio URL for download');
      await updateDownloadNotification('failed', track.id, track.title, 0, 'Could not resolve stream URL.');
      clearLoggedPct(track.id);
      return false;
    }

    // Jaudiotagger requires an MP4/M4A format to write metadata properly.
    // If we pass a WEBM stream masquerading as .m4a, tag writing will silently fail!
    let downloadUrl = resolved.track.url;
    const mp4Format = resolved.allAudio?.find((f: any) => f.format === 'MP4');
    if (mp4Format && mp4Format.url) {
      downloadUrl = mp4Format.url;
    }

    const activeDir = await getActiveDirectory();
    const fileExtension = '.m4a';
    const filename = `${track.id}${fileExtension}`;
    const localUri = `${activeDir}${filename}`;

    let resultUri: string | null = null;

    try {
      const destPath = localUri.replace('file://', '');
      const fetchHeaders = { ...(resolved.track.headers || {}) };
      if (!fetchHeaders['Accept-Encoding']) {
        fetchHeaders['Accept-Encoding'] = 'identity';
      }
        
        let totalSize = -1;
        try {
          if (__DEV__) console.log('[DEBUG] Trying JS fetch HEAD to get content length...');
          const headRes = await fetch(downloadUrl, { method: 'HEAD', headers: fetchHeaders });
          const cl = headRes.headers.get('content-length');
          if (cl) totalSize = parseInt(cl, 10);
          if (__DEV__) console.log(`[DEBUG] JS fetch HEAD status: ${headRes.status}, Content-Length: ${totalSize}`);
        } catch (fetchErr) {
          console.warn('[DEBUG] JS fetch HEAD failed:', fetchErr);
        }

        delete pausedDownloadingIds[track.id];
        delete pausedStates[track.id];
        delete pausedDownloadingTracks[track.id];
        DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
        startSpeedTracking();

        if (totalSize <= 0) {
          // Fallback to normal download if we don't know the size
          if (__DEV__) console.log('[DEBUG] Unknown size, falling back to standard download');
          const task = ReactNativeBlobUtil.config({
            path: destPath,
            fileCache: true,
            overwrite: true,
            timeout: 1000 * 60 * 60,
          }).fetch('GET', downloadUrl, fetchHeaders);

          task.progress({ interval: 250 }, (received, total) => {
            const receivedNum = Number(received);
            const totalNum = Number(total);
            if (totalNum <= 0) return;
            const progress = (receivedNum / totalNum) * 0.95;
            if (onProgress) onProgress(progress);
            updateDownloadNotification('progress', track.id, track.title, progress);
            const prev = activeBytesWritten[track.id] || 0;
            const diff = receivedNum - prev;
            if (diff > 0) globalTotalWritten += diff;
            activeBytesWritten[track.id] = receivedNum;
            downloadingSizes[track.id] = totalNum;
          });

          activeResumables[track.id] = {
            pauseAsync: async () => { task.cancel(); return {}; },
            cancelAsync: async () => { task.cancel(); }
          };

          const res = await task;
          if (res.info().status === 200) {
            resultUri = localUri;
          } else {
            throw new Error(`HTTP ${res.info().status}`);
          }
        } else {
          // Chunked Download Bypass
          const CHUNK_SIZE = 1024 * 1024; // 1 MB chunks
          let currentOffset = 0;
          let isCancelled = false;
          let currentTask: any = null;

          activeResumables[track.id] = {
            pauseAsync: async () => { isCancelled = true; if (currentTask) currentTask.cancel(); return {}; },
            cancelAsync: async () => { isCancelled = true; if (currentTask) currentTask.cancel(); }
          };

          while (currentOffset < totalSize && !isCancelled) {
            const endOffset = Math.min(currentOffset + CHUNK_SIZE - 1, totalSize - 1);
            const chunkHeaders = { ...fetchHeaders, Range: `bytes=${currentOffset}-${endOffset}` };
            
            if (__DEV__) console.log(`[DEBUG] Downloading chunk ${currentOffset}-${endOffset}...`);
            
            const task = ReactNativeBlobUtil.config({
              path: destPath,
              fileCache: true,
              overwrite: currentOffset === 0, // Overwrite on first chunk, append on subsequent
              timeout: 1000 * 30, // 30s timeout per chunk
            }).fetch('GET', downloadUrl, chunkHeaders);

            currentTask = task;

            task.progress({ interval: 250 }, (received, total) => {
              const receivedNum = Number(received);
              const totalDownloaded = currentOffset + receivedNum;
              const progress = (totalDownloaded / totalSize) * 0.95;
              if (onProgress) onProgress(progress);
              updateDownloadNotification('progress', track.id, track.title, progress);
              const prev = activeBytesWritten[track.id] || 0;
              const diff = totalDownloaded - prev;
              if (diff > 0) globalTotalWritten += diff;
              activeBytesWritten[track.id] = totalDownloaded;
              downloadingSizes[track.id] = totalSize;
            });

            try {
              const res = await task;
              if (res.info().status === 200 || res.info().status === 206) {
                currentOffset = endOffset + 1;
              } else {
                throw new Error(`HTTP ${res.info().status}`);
              }
            } catch (err: any) {
              if (isCancelled) {
                break;
              }
              // If it fails (e.g. timeout), throw to retry or fail the whole download
              throw err;
            }
          }

          if (!isCancelled && currentOffset >= totalSize) {
            resultUri = localUri;
          } else if (!isCancelled) {
            throw new Error('Download incomplete');
          } else {
             // Handle cancellation
             throw new Error('Download cancelled');
          }
        }
      } catch (err: any) {
        if (__DEV__) {
          console.warn('[DEBUG] rn-blob-util download failed!', err);
          console.warn('[DEBUG] error keys:', Object.keys(err));
          console.warn('[DEBUG] error message:', err.message);
          if (err.status) console.warn('[DEBUG] error status:', err.status);
        }
      }

    if (!resultUri) {
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
      } catch (_) { }

      clearLoggedPct(track.id);
      delete activeResumables[track.id];
      delete pausedDownloadingTracks[track.id];
      return false;
    }

    const fileInfo = await getInfoAsync(resultUri);
    const size = fileInfo.exists ? fileInfo.size : undefined;

    // Fetch and save artwork image locally
    let savedArtworkUri = track.artwork;
    if (track.artwork && track.artwork.trim() !== '') {
      try {
        const imagePath = `${activeDir}${track.id}.jpg`;
        const downloadResult = await downloadAsync(track.artwork, imagePath);
        if (downloadResult && downloadResult.uri) {
          savedArtworkUri = downloadResult.uri;
          if (__DEV__) console.log(`[downloadTrack] Saved artwork locally to: ${savedArtworkUri}`);
        }
      } catch (err) {
        if (__DEV__) console.warn('[downloadTrack] Failed to download artwork locally:', err);
      }
    }

    const cleaned = cleanMetadata(track.title, track.artist);
    const updatedTrack = {
      ...track,
      title: cleaned.title,
      artist: cleaned.artist,
      artwork: savedArtworkUri,
    };

    // Fetch and save lyrics locally
    if (onProgress) onProgress(0.96);
    await updateDownloadNotification('progress', track.id, track.title, 0.96);
    let standardLrcText: string | null = null;
    let hasLrc = false;
    try {
      const lrcLines = await fetchLyricsFromApis(track.title, track.artist, track.duration || 0, track.id);
      if (lrcLines && lrcLines.length > 0 && lrcLines[0].text !== 'Lyrics not found') {
        const lrcUri = `${activeDir}${track.id}.lrc`;
        await writeAsStringAsync(lrcUri, JSON.stringify(lrcLines));
        if (__DEV__) console.log(`[downloadTrack] Saved lyrics to: ${lrcUri}`);
        hasLrc = true;

        const tags = [
          `[ti:${track.title}]`,
          `[ar:${track.artist}]`,
          track.album ? `[al:${track.album}]` : '',
          track.duration ? `[length:${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}]` : '',
        ].filter(Boolean);

        const linesFormatted = lrcLines.map((line: any) => {
          const ms = line.time || 0;
          const totalSeconds = Math.max(0, ms / 1000);
          const minutes = Math.floor(totalSeconds / 60);
          const seconds = Math.floor(totalSeconds % 60);
          const hundredths = Math.floor((totalSeconds % 1) * 100);

          const mm = String(minutes).padStart(2, '0');
          const ss = String(seconds).padStart(2, '0');
          const xx = String(hundredths).padStart(2, '0');

          return `[${mm}:${ss}.${xx}]${line.text || ''}`;
        });
        standardLrcText = [...tags, ...linesFormatted].join('\n');
      }
    } catch (lrcErr) {
      if (__DEV__) console.warn('[downloadTrack] Failed to fetch/save lyrics for download:', lrcErr);
    }

    const downloads = await getDownloadedTracks();
    const newDownload: DownloadedTrack = {
      track: updatedTrack,
      localUri: resultUri,
      downloadedAt: new Date().toISOString(),
      size,
      hasLrc,
    };
    downloads.push(newDownload);
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));

    // Add to local 'Downloads' playlist
    try {
      const localPlaylists = await getLocalPlaylists();
      let downloadsPlaylist = localPlaylists.find(p => p.name.toLowerCase() === 'downloads');
      if (!downloadsPlaylist) {
        downloadsPlaylist = await createLocalPlaylist('Downloads');
      }
      if (downloadsPlaylist) {
        await addTrackToLocalPlaylist(downloadsPlaylist.id, updatedTrack);
      }
    } catch (err) {
      if (__DEV__) console.warn('[downloadTrack] Failed to add track to local Downloads playlist:', err);
    }

    // Embed metadata, artwork, and lyrics directly in the local file path!
    if (onProgress) onProgress(0.98);
    await updateDownloadNotification('progress', track.id, track.title, 0.98);
    try {
      if (Platform.OS === 'android') {
        const nativeModule = requireNativeModule('Innertube');
        const localFilePath = resultUri.replace('file://', '');
        await nativeModule.embedMetadataAndLyrics(
          localFilePath,
          updatedTrack.title,
          updatedTrack.artist,
          updatedTrack.album || null,
          standardLrcText,
          updatedTrack.artwork || null
        );
        if (__DEV__) console.log(`[downloadTrack] Successfully embedded metadata inside local audio file.`);
      }
    } catch (embedErr) {
      if (__DEV__) console.warn('[downloadTrack] Failed to embed metadata natively during download:', embedErr);
    }

    delete activeResumables[track.id];
    delete pausedDownloadingTracks[track.id];
    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
    await updateDownloadNotification('complete', track.id, track.title, 0, '', updatedTrack.artwork);

    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        toast.success(`Downloaded "${track.title}"`);
      }
    } catch (_) { }

    clearLoggedPct(track.id);
    return true;
  } catch (e) {
    console.error('Failed to download track:', e);

    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        toast.error(`Failed to download "${track.title}"`);
      }
    } catch (_) { }

    if (activeResumables[track.id] === undefined && pausedDownloadingIds[track.id] === undefined) {
      delete pausedDownloadingTracks[track.id];
      return false;
    }
    await updateDownloadNotification('failed', track.id, track.title, 0, e instanceof Error ? e.message : 'An error occurred.');
    clearLoggedPct(track.id);
    delete activeResumables[track.id];
    delete pausedDownloadingTracks[track.id];
    return false;
  } finally {
    delete activeBytesWritten[track.id];
    delete downloadingSizes[track.id];
  }
}

export async function pauseDownload(trackId: string): Promise<void> {
  const resumable = activeResumables[trackId];
  if (resumable) {
    try {
      const pauseResult = await resumable.pauseAsync();
      pausedStates[trackId] = pauseResult;
      pausedDownloadingIds[trackId] = true;
      pausedDownloadingTracks[trackId] = activeDownloadingTracks[trackId] || queuedDownloadingTracks[trackId];
      DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
      const trackTitle = activeDownloadingTracks[trackId]?.title || 'track';
      await updateDownloadNotification('paused', trackId, trackTitle);
    } catch (e) {
      console.warn('Failed to pause download:', e);
    }
  } else {
    const queuedTrack = queuedDownloadingTracks[trackId];
    if (queuedTrack) {
      pausedDownloadingIds[trackId] = true;
      pausedDownloadingTracks[trackId] = queuedTrack;
      pausedStates[trackId] = true;
      const idx = downloadQueue.findIndex(t => String(t.id) === String(trackId));
      if (idx !== -1) {
        downloadQueue.splice(idx, 1);
      }
      delete queuedDownloadingTracks[trackId];
      DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
      await updateDownloadNotification('paused', trackId, queuedTrack.title);
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
  delete pausedDownloadingTracks[trackId];
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
      const baseUri = found.localUri.replace(/\.[^/.]+$/, "");
      await deleteAsync(baseUri + '.lrc', { idempotent: true }).catch(() => {});
      await deleteAsync(baseUri + '.jpg', { idempotent: true }).catch(() => {});
    } catch (err) {
      console.warn('Failed to delete files from disk', err);
    }

    const filtered = downloads.filter((d) => String(d.track.id) !== String(trackId));
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(filtered));

    // Remove track from local 'Downloads' playlist as well
    try {
      const localPlaylists = await getLocalPlaylists();
      const downloadsPlaylist = localPlaylists.find(p => p.name.toLowerCase() === 'downloads');
      if (downloadsPlaylist) {
        await removeTrackFromLocalPlaylist(downloadsPlaylist.id, trackId);
      }
    } catch (err) {
      if (__DEV__) console.warn('[deleteDownload] Failed to remove track from local Downloads playlist:', err);
    }

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
        const baseUri = d.localUri.replace(/\.[^/.]+$/, "");
        await deleteAsync(baseUri + '.lrc', { idempotent: true }).catch(() => {});
        await deleteAsync(baseUri + '.jpg', { idempotent: true }).catch(() => {});
      } catch (err) {
        console.warn('Failed to delete files', d.localUri, err);
      }
    }
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify([]));

    // Delete local 'Downloads' playlist
    try {
      const localPlaylists = await getLocalPlaylists();
      const downloadsPlaylist = localPlaylists.find(p => p.name.toLowerCase() === 'downloads');
      if (downloadsPlaylist) {
        await deleteLocalPlaylist(downloadsPlaylist.id);
      }
    } catch (err) {
      if (__DEV__) console.warn('[clearAllDownloads] Failed to delete local Downloads playlist:', err);
    }

    DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
  } catch (e) {
    console.error('Failed to clear all downloads', e);
  }
}

export async function pauseAllDownloads(): Promise<void> {
  // Pause active resumables
  for (const trackId of Object.keys(activeResumables)) {
    await pauseDownload(trackId);
  }
  // Pause enqueued downloads
  for (const track of [...downloadQueue]) {
    pausedDownloadingIds[track.id] = true;
    pausedDownloadingTracks[track.id] = track;
    pausedStates[track.id] = true;
  }
  // Remove them from queue while enqueued
  downloadQueue.length = 0;
  Object.keys(queuedDownloadingTracks).forEach(id => {
    delete queuedDownloadingTracks[id];
  });
  DeviceEventEmitter.emit(DOWNLOADS_UPDATED_EVENT);
}

export async function resumeAllDownloads(): Promise<void> {
  const pausedIds = Object.keys(pausedDownloadingTracks);
  for (const id of pausedIds) {
    const track = pausedDownloadingTracks[id];
    if (track) {
      delete pausedDownloadingTracks[id];
      delete pausedDownloadingIds[id];
      enqueueTrack(track);
    }
  }
}

export async function cancelAllDownloads(): Promise<void> {
  // Cancel active ones
  for (const trackId of Object.keys(activeResumables)) {
    await cancelDownload(trackId);
  }
  // Cancel queued ones
  const queuedIds = Object.keys(queuedDownloadingTracks);
  for (const trackId of queuedIds) {
    await cancelDownload(trackId);
  }
  // Cancel paused ones
  const pausedIds = Object.keys(pausedDownloadingTracks);
  for (const trackId of pausedIds) {
    await cancelDownload(trackId);
  }
}

export async function checkExportDuplicates(directoryUri: string): Promise<string[]> {
  try {
    const tracks = await getDownloadedTracks();
    const files = await StorageAccessFramework.readDirectoryAsync(directoryUri);
    const decodedFiles = files.map(f => decodeURIComponent(f).toLowerCase());

    const duplicates: string[] = [];

    for (const d of tracks) {
      const track = d.track;
      const cleanTitle = track.title.replace(/[\/\\:*?"<>|]/g, '_');
      const safeName = `${cleanTitle}`.toLowerCase();

      const exists = decodedFiles.some(f =>
        f.endsWith('/' + safeName + '.m4a') ||
        f.endsWith('/' + safeName + '.mp3')
      );

      if (exists) {
        duplicates.push(track.title);
      }
    }

    return duplicates;
  } catch (err) {
    console.error('Failed to check export duplicates', err);
    return [];
  }
}

export async function exportSongsToFolder(
  directoryUri: string,
  options: {
    overwriteMode: 'overwrite' | 'skip';
    embedLyrics: boolean;
    onProgress?: (current: number, total: number, title: string) => void;
  }
): Promise<void> {
  const { overwriteMode, embedLyrics, onProgress } = options;

  try {
    const tracks = await getDownloadedTracks();
    if (tracks.length === 0) {
      toast.info('No downloaded tracks to export.');
      return;
    }

    const activeDir = await getActiveDirectory();
    const files = await StorageAccessFramework.readDirectoryAsync(directoryUri);
    const decodedFiles = files.map(f => decodeURIComponent(f).toLowerCase());

    let successCount = 0;
    let index = 0;

    for (const d of tracks) {
      index++;
      const track = d.track;
      onProgress?.(index, tracks.length, track.title);

      const cleaned = cleanMetadata(track.title, track.artist);
      const cleanTitle = cleaned.title.replace(/[\/\\:*?"<>|]/g, '_');
      const safeName = `${cleanTitle}`;
      const safeNameLower = safeName.toLowerCase();

      // Check duplicate
      const duplicateUri = files.find(f => {
        const dec = decodeURIComponent(f).toLowerCase();
        return dec.endsWith('/' + safeNameLower + '.m4a') || dec.endsWith('/' + safeNameLower + '.mp3');
      });

      if (duplicateUri) {
        if (overwriteMode === 'skip') {
          continue;
        } else if (overwriteMode === 'overwrite') {
          try {
            await deleteAsync(duplicateUri);
          } catch (delErr) {
            console.warn('Failed to delete existing duplicate file', delErr);
          }
        }
      }

      // 1. Export Audio File
      const audioUri = d.localUri;
      const audioInfo = await getInfoAsync(audioUri);
      if (audioInfo.exists) {
        try {
          const isM4a = audioUri.endsWith('.m4a');
          const mimeType = isM4a ? 'audio/mp4' : 'audio/mpeg';
          const ext = isM4a ? 'm4a' : 'mp3';

          // A. Read the cached LRC file
          const lrcUri = `${activeDir}${track.id}.lrc`;
          const lrcInfo = await getInfoAsync(lrcUri);
          let standardLrcText: string | null = null;

          if (lrcInfo.exists) {
            try {
              const lrcRaw = await readAsStringAsync(lrcUri);
              const lines = JSON.parse(lrcRaw);
              if (Array.isArray(lines)) {
                const tags = [
                  `[ti:${cleaned.title}]`,
                  `[ar:${cleaned.artist}]`,
                  track.album ? `[al:${track.album}]` : '',
                  track.duration ? `[length:${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}]` : '',
                ].filter(Boolean);

                const linesFormatted = lines.map((line: any) => {
                  const ms = line.time || 0;
                  const totalSeconds = Math.max(0, ms / 1000);
                  const minutes = Math.floor(totalSeconds / 60);
                  const seconds = Math.floor(totalSeconds % 60);
                  const hundredths = Math.floor((totalSeconds % 1) * 100);

                  const mm = String(minutes).padStart(2, '0');
                  const ss = String(seconds).padStart(2, '0');
                  const xx = String(hundredths).padStart(2, '0');

                  return `[${mm}:${ss}.${xx}]${line.text || ''}`;
                });

                standardLrcText = [...tags, ...linesFormatted].join('\n');
              }
            } catch (lrcErr) {
              console.warn(`Failed to parse lyrics for ${track.title}`, lrcErr);
            }
          }

          // B. Copy the cached audio file to a temporary file
          const tempAudioUri = cacheDirectory + `temp_export_${track.id}.${ext}`;
          await copyAsync({ from: audioUri, to: tempAudioUri });

          // C. Embed/update metadata on the temporary copy natively
          try {
            if (Platform.OS === 'android') {
              const nativeModule = requireNativeModule('Innertube');
              const localFilePath = tempAudioUri.replace('file://', '');
              
              // embedLyrics determines if we write standardLrcText or null (null strips existing lyrics)
              await nativeModule.embedMetadataAndLyrics(
                localFilePath,
                cleaned.title,
                cleaned.artist,
                track.album || null,
                embedLyrics ? (standardLrcText || null) : null,
                track.artwork || null // Re-embed the cached artwork image explicitly
              );
            }
          } catch (embedErr) {
            console.warn('Failed to embed metadata/lyrics inside temp copy', embedErr);
          }

          // D. Use native copyToSaf to write directly to SAF destination without base64 corruption
          const destAudioUri = await StorageAccessFramework.createFileAsync(
            directoryUri,
            `${safeName}.${ext}`,
            mimeType
          );
          
          if (Platform.OS === 'android') {
            const nativeModule = requireNativeModule('Innertube');
            const localFilePath = tempAudioUri.replace('file://', '');
            await nativeModule.copyToSaf(localFilePath, destAudioUri);
          } else {
            const audioBase64 = await readAsStringAsync(tempAudioUri, { encoding: EncodingType.Base64 });
            await writeAsStringAsync(destAudioUri, audioBase64, { encoding: EncodingType.Base64 });
          }

          // E. Delete temp copy
          await deleteAsync(tempAudioUri, { idempotent: true }).catch(() => {});

          // 2. If separate LRC files are requested, write the standard LRC file alongside
          if (!embedLyrics && standardLrcText) {
            try {
              const destLrcUri = await StorageAccessFramework.createFileAsync(
                directoryUri,
                `${safeName}.lrc`,
                'text/plain'
              );
              await writeAsStringAsync(destLrcUri, standardLrcText);
            } catch (lrcWriteErr) {
              console.warn('Failed to write separate LRC file', lrcWriteErr);
            }
          }

          successCount++;
        } catch (audioErr) {
          console.warn(`Failed to export audio for ${track.title}`, audioErr);
        }
      }
    }

    toast.success(`Successfully exported ${successCount}/${tracks.length} tracks!`);
  } catch (err) {
    console.error('Failed to export downloads', err);
    toast.error('Failed to export downloads.');
  }
}
