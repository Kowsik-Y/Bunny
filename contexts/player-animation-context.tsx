import React, { createContext, useContext, useCallback, useMemo, useEffect } from 'react';
import { Dimensions } from 'react-native';
import Animated, { useSharedValue, withSpring, SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MINI_PLAYER_HEIGHT, PLAYER_BOTTOM_OFFSET } from '@/constants/layout';

const { height } = Dimensions.get('window');

type PlayerAnimationContextValue = {
  translateY: SharedValue<number>;
  snapCollapsed: SharedValue<number>;
  bottomOffset: SharedValue<number>;
  expand: () => void;
  collapse: () => void;
};

const PlayerAnimationContext = createContext<PlayerAnimationContextValue | null>(null);

export const SPRING_CONFIG = {
  damping: 25,
  stiffness: 200,
  overshootClamping: true,
};

export function PlayerAnimationProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const initialSnap = height - MINI_PLAYER_HEIGHT - (PLAYER_BOTTOM_OFFSET + insets.bottom);
  const snapCollapsed = useSharedValue(initialSnap); 
  const translateY = useSharedValue(initialSnap);
  const bottomOffset = useSharedValue(PLAYER_BOTTOM_OFFSET + insets.bottom);

  useEffect(() => {
    const nextOffset = PLAYER_BOTTOM_OFFSET + insets.bottom;
    bottomOffset.value = nextOffset;
    snapCollapsed.value = height - MINI_PLAYER_HEIGHT - nextOffset;
    translateY.value = height - MINI_PLAYER_HEIGHT - nextOffset;
  }, [insets.bottom]);

  const expand = useCallback(() => {
    translateY.value = withSpring(0, SPRING_CONFIG);
  }, []);

  const collapse = useCallback(() => {
    translateY.value = withSpring(snapCollapsed.value, SPRING_CONFIG);
  }, []);

  const value = useMemo(() => ({
    translateY,
    snapCollapsed,
    bottomOffset,
    expand,
    collapse,
  }), [expand, collapse]);

  return (
    <PlayerAnimationContext.Provider value={value}>
      {children}
    </PlayerAnimationContext.Provider>
  );
}

export function usePlayerAnimation() {
  const context = useContext(PlayerAnimationContext);
  if (!context) {
    throw new Error('usePlayerAnimation must be used within PlayerAnimationProvider');
  }
  return context;
}
