// @flow
import React from 'react';
import { type AppTrack } from './Tracks';

type PlayerContextType = {
  track: AppTrack | null;
  setTrack: (track: AppTrack | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  progress: number;
  setProgress: (progress: number) => void;
};

const MusicPlayerContext = React.createContext<PlayerContextType>({
  track: null,
  setTrack: () => {},
  isPlaying: false,
  setIsPlaying: () => {},
  progress: 0,
  setProgress: () => {},
});

export default MusicPlayerContext;