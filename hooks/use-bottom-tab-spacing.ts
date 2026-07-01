import { useCurrentTrack } from '@/services';
import { TAB_BAR_HEIGHT, PLAYER_TOTAL_HEIGHT } from '@/constants/layout';

export function useBottomTabSpacing() {
  const currentTrack = useCurrentTrack();
  
  // If a track is active, the MiniPlayer is visible on top of the Tab Bar.
  // We need enough padding to clear the MiniPlayer.
  // Otherwise, we just need to clear the Tab Bar.
  return currentTrack ? PLAYER_TOTAL_HEIGHT + 20 : TAB_BAR_HEIGHT + 20;
}
