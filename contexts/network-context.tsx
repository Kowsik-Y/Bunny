import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type NetworkContextType = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
};

const NetworkContext = createContext<NetworkContextType | null>(null);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [networkState, setNetworkState] = useState<NetworkContextType>({
    isConnected: true, // Optimistically assume connected initially
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then((state) => {
      setNetworkState({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    // Subscribe to ongoing changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkState({
        isConnected: state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkState() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkState must be used within a NetworkProvider');
  }
  return context;
}
