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
  DOWNLOADS_UPDATED_EVENT,
} from './state';
import {
  getDownloadedTracks,
  getDownloadLocation,
  setDownloadLocation,
} from './storage';
import {
  enqueueTrack,
  deleteDownload,
  pauseDownload,
  cancelDownload,
  clearAllDownloads,
} from './manager';

export function useDownloads() {
  const [downloadedTracks, setDownloadedTracks] = useState<DownloadedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingIds, setDownloadingIds] = useState<Record<string, number>>({});
  const [downloadingTracks, setDownloadingTracks] = useState<Record<string, AppTrack>>({});
  const [pausedDownloadingIdsState, setPausedDownloadingIdsState] = useState<Record<string, boolean>>({});
  const [downloadLocation, setDownloadLocationState] = useState<'internal' | 'cache'>('internal');

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
