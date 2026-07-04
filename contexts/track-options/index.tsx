import { useContext } from 'react';
import { TrackOptionsContext } from './context';

export * from './types';
export { TrackOptionsContext };
export { TrackOptionsProvider } from './provider';

export function useTrackOptions() {
  const context = useContext(TrackOptionsContext);
  if (!context) {
    throw new Error('useTrackOptions must be used within a TrackOptionsProvider');
  }
  return context;
}
