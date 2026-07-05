import { type AppTrack } from '../Tracks';

export type HeaderRow = {
  type: 'header';
  key: string;
  title: string;
  sectionType?: 'upNext' | 'dynamic';
  showClear?: boolean;
};

export type EmptyRow = { type: 'empty'; key: string; text: string };

export type TrackRow = {
  type: 'item';
  key: string;
  item: AppTrack;
  originalIndex: number;
  localIdx: number;
  isHistory: boolean;
  isNowPlaying: boolean;
  sectionStart: number;
  sectionEnd: number;
};

export type FlatRow = HeaderRow | EmptyRow | TrackRow;

export interface QueueTabProps {
  track: AppTrack;
  onSkipToTrack: (id: string) => void;
  primaryColor: string;
  isVisible?: boolean;
}
