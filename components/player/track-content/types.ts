import { type AppTrack } from '../Tracks';

export type Palette = [string, string, string, string];

export interface TrackContentProps {
  track: AppTrack;
  queue: AppTrack[];
  isPlaying: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  buffered?: number;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (pos: number) => void;
  onSkipToTrack: (id: string) => void;
  onShuffle: () => void;
  onRepeat: () => void;
  shuffleOn: boolean;
  repeatOn: boolean;
  panGesture: any;
  onCollapse: () => void;
  onVideoModeChange?: (info: { isVideo: boolean; playPause: () => void }) => void;
}
