import { type AppTrack } from '@/components/player/Tracks';

export interface LocalPlaylist {
  id: string;
  name: string;
  tracks: AppTrack[];
  createdAt: string;
}
