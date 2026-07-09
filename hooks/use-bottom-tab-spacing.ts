import { PLAYER_TOTAL_HEIGHT } from '@/constants/layout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useBottomTabSpacing() {
  const insets = useSafeAreaInsets();
  // Always reserve spacing for the MiniPlayer so the layout is consistent
  // and the player remains visible and accessible at all times.
  return PLAYER_TOTAL_HEIGHT + insets.bottom + 20;
}
