import { type AppTrack } from '@/components/player/Tracks';

export interface TrackOptionsContextType {
  openTrackOptions: (track: AppTrack) => void;
  openAlbumOptions: (album: { id: string; title: string; artist: string; artwork?: string; artistId?: string }) => void;
  openPlaylistOptions: (playlist: { id: string; name: string; songCount?: number; artwork?: string }) => void;
  openArtistOptions: (artist: { id: string; name: string; artwork?: string }) => void;
  openCreditsSheet: (track: AppTrack) => void;
}

export interface SelectedItemState {
  type: 'track' | 'album' | 'artist' | 'playlist';
  id: string;
  title: string;
  artist?: string;
  artwork?: string;
  artistId?: string;
  albumId?: string;
}
