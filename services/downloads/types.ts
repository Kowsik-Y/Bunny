import { type AppTrack } from '@/components/player/Tracks';

export interface DownloadedTrack {
  track: AppTrack;
  localUri: string;
  downloadedAt: string;
  size?: number;
  hasLrc?: boolean;
}
