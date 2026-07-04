import { createContext } from 'react';
import { TrackOptionsContextType } from './types';

export const TrackOptionsContext = createContext<TrackOptionsContextType | undefined>(undefined);
