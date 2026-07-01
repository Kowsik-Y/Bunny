import React, { createContext, useContext, useCallback, useMemo } from 'react';
import { Dimensions } from 'react-native';
import Animated, { useSharedValue, withSpring, SharedValue } from 'react-native-reanimated';

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
  // Use a height-based initial value but it will be corrected by MusicPlayerModal on mount
  const snapCollapsed = useSharedValue(height); 
  const translateY = useSharedValue(height);
  const bottomOffset = useSharedValue(0);

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
