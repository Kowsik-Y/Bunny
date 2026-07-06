import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as Notifications from 'expo-notifications';
import { type AppTrack } from '@/components/player/Tracks';
import { toast } from '../toast';
import { DownloadedTrack } from './types';
import {
  activeDownloadingTracks,
  queuedDownloadingTracks,
  activeDownloadingIds,
  pausedDownloadingIds,
  pausedDownloadingTracks,
  DOWNLOADS_UPDATED_EVENT,
  progressState,
  downloadingSizes,
} from './state';
import {
  getDownloadedTracks,
  getDownloadLocation,
  setDownloadLocation,
  getConcurrentLimit,
  setConcurrentLimit,
} from './storage';
import {
  enqueueTrack,
  deleteDownload,
  pauseDownload,
  cancelDownload,
  clearAllDownloads,
  pauseAllDownloads,
  resumeAllDownloads,
  cancelAllDownloads,
  exportSongsToFolder,
  checkExportDuplicates,
} from './manager';

export function useDownloads() {
  const [downloadedTracks, setDownloadedTracks] = useState<DownloadedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<Record<string, number>>({});
  const [downloadingTracks, setDownloadingTracks] = useState<Record<string, AppTrack>>({});
  const [pausedDownloadingIdsState, setPausedDownloadingIdsState] = useState<Record<string, boolean>>({});
  const [downloadLocation, setDownloadLocationState] = useState<'internal' | 'cache'>('internal');
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [downloadingSizesState, setDownloadingSizesState] = useState<Record<string, number>>({});

  const isPendingRef = useRef(false);
  const nextLoadRef = useRef<(() => void) | null>(null);

  const load = useCallback(async () => {
    if (isPendingRef.current) {
      nextLoadRef.current = load;
      return;
    }
    isPendingRef.current = true;

    try {
      setLoading(true);
      const list = await getDownloadedTracks();
      setDownloadedTracks(list);
      const loc = await getDownloadLocation();
      setDownloadLocationState(loc);
      const limit = await getConcurrentLimit();
      setConcurrentLimitState(limit);
      
      const mergedTracks = { ...activeDownloadingTracks, ...queuedDownloadingTracks, ...pausedDownloadingTracks };
      const mergedIds = { ...activeDownloadingIds };
      Object.keys(queuedDownloadingTracks).forEach(id => {
        if (mergedIds[id] === undefined) {
          mergedIds[id] = 0;
        }
      });
      Object.keys(pausedDownloadingTracks).forEach(id => {
        if (mergedIds[id] === undefined) {
          mergedIds[id] = 0;
        }
      });

      setDownloadingIds(mergedIds);
      setDownloadingTracks(mergedTracks);
      setPausedDownloadingIdsState({ ...pausedDownloadingIds });
      setDownloadSpeed(progressState.downloadSpeed || 0);
      setUploadSpeed(progressState.uploadSpeed || 0);
      setDownloadingSizesState({ ...downloadingSizes });
      setLoading(false);
    } finally {
      isPendingRef.current = false;
      if (nextLoadRef.current) {
        const next = nextLoadRef.current;
        nextLoadRef.current = null;
        setTimeout(next, 150); // throttle progress updates to 150ms
      }
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(DOWNLOADS_UPDATED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const startDownload = async (track: AppTrack) => {
    const existing = downloadedTracks.some((d) => String(d.track.id) === String(track.id));
    if (existing) return true;
    
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        const req = await Notifications.requestPermissionsAsync();
        if (!req.granted) {
          DeviceEventEmitter.emit('show_notification_permission_alert');
        }
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

  const [concurrentLimit, setConcurrentLimitState] = useState<number>(3);

  const changeConcurrentLimit = async (limit: number) => {
    await setConcurrentLimit(limit);
    setConcurrentLimitState(limit);
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
    pauseAllDownloads,
    resumeAllDownloads,
    cancelAllDownloads,
    concurrentLimit,
    changeConcurrentLimit,
    exportDownloads: exportSongsToFolder,
    checkExportDuplicates,
    downloadSpeed,
    uploadSpeed,
    downloadingSizes: downloadingSizesState,
  };
}
