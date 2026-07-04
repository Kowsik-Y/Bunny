import React from 'react';
import { TrackOptionsState } from './use-track-options-state';
import { MainSheet } from './sheets/main-sheet';
import { PlaylistsSheet } from './sheets/playlists-sheet';
import { CreditsSheet } from './sheets/credits-sheet';
import { StatsSheet } from './sheets/stats-sheet';

interface SheetsContentProps {
  state: TrackOptionsState;
}

export function SheetsContent({ state }: SheetsContentProps) {
  const { sheetScreen } = state;

  switch (sheetScreen) {
    case 'main':
      return <MainSheet state={state} />;
    case 'playlists':
      return <PlaylistsSheet state={state} />;
    case 'credits':
      return <CreditsSheet state={state} />;
    case 'stats':
      return <StatsSheet state={state} />;
    default:
      return null;
  }
}
