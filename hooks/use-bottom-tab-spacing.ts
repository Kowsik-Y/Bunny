import { PLAYER_TOTAL_HEIGHT } from '@/constants/layout';

export function useBottomTabSpacing() {
  // Always reserve spacing for the MiniPlayer so the layout is consistent
  // and the player remains visible and accessible at all times.
  return PLAYER_TOTAL_HEIGHT + 20;
}
