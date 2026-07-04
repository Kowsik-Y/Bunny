import { type AppTrack } from '@/components/player/Tracks';

export const DOWNLOADS_KEY = '@bunny_downloads';
export const DOWNLOAD_LOCATION_KEY = '@bunny_download_location';
export const DOWNLOADS_UPDATED_EVENT = 'downloads_updated';

// Global active download task registry
export const activeResumables: Record<string, any> = {};
export const pausedStates: Record<string, any> = {};
export const pausedDownloadingIds: Record<string, boolean> = {};
export const activeDownloadingIds: Record<string, number> = {};
export const activeDownloadingTracks: Record<string, AppTrack> = {};

// Queue of tracks to be downloaded
export const downloadQueue: AppTrack[] = [];
export const queuedDownloadingTracks: Record<string, AppTrack> = {};

export const progressState = {
  isProcessingQueue: false,
  totalDownloadCount: 0,
  currentDownloadIndex: 0,
};
