import { type AppTrack } from '@/components/player/Tracks';

export const DOWNLOADS_KEY = '@bunny_downloads';
export const DOWNLOAD_LOCATION_KEY = '@bunny_download_location';
export const CONCURRENT_LIMIT_KEY = '@bunny_concurrent_limit';
export const DOWNLOAD_ENGINE_KEY = '@bunny_download_engine';
export const DOWNLOADS_UPDATED_EVENT = 'downloads_updated';

// Global active download task registry
export const activeResumables: Record<string, any> = {};
export const pausedStates: Record<string, any> = {};
export const pausedDownloadingIds: Record<string, boolean> = {};
export const activeDownloadingIds: Record<string, number> = {};
export const activeDownloadingTracks: Record<string, AppTrack> = {};
export const pausedDownloadingTracks: Record<string, AppTrack> = {};
export const downloadingSizes: Record<string, number> = {};

// Queue of tracks to be downloaded
export const downloadQueue: AppTrack[] = [];
export const queuedDownloadingTracks: Record<string, AppTrack> = {};

export const progressState = {
  isProcessingQueue: false,
  totalDownloadCount: 0,
  currentDownloadIndex: 0,
  downloadSpeed: 0,
  uploadSpeed: 0,
};
