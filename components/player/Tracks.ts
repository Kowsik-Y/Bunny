import { Track } from 'react-native-track-player';

// Extend RNTP's Track type with any extra metadata we need
export type AppTrack = Track & {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  artwork: string;
  url: string | number;
  videoUrl?: string;
  artistId?: string;
  albumId?: string;
  artists?: { name: string; id: string }[];
  allAudio?: any[];
  activeItag?: number;
  allVideo?: any[];
  activeVideoItag?: number;
  website?: string;
  streamHost?: string;
};

const tracks: AppTrack[] = [];

export default tracks;