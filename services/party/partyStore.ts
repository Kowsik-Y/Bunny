import { create } from 'zustand';
import { NsdService } from '@/modules/nsd';

export interface PartyClient {
  id: string;
  name: string;
  x: number; // 0 to 1 representing position on grid
  y: number; // 0 to 1 representing position on grid
  ip: string;
  port: number;
  volume: number; // Computed volume multiplier (0.0 to 1.0)
}

export type PartyMode = 'idle' | 'host' | 'client';
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface PartyState {
  partyMode: PartyMode;
  connectionState: ConnectionState;
  discoveredHosts: NsdService[];
  connectedClients: PartyClient[];
  listenerPosition: { x: number; y: number }; // 0 to 1 representing position on grid
  clockOffset: number;
  partyName: string;
  setPartyMode: (mode: PartyMode) => void;
  setConnectionState: (state: ConnectionState) => void;
  setDiscoveredHosts: (hosts: NsdService[]) => void;
  addDiscoveredHost: (host: NsdService) => void;
  removeDiscoveredHost: (serviceName: string) => void;
  setConnectedClients: (clients: PartyClient[]) => void;
  updateClientPosition: (id: string, x: number, y: number) => void;
  setListenerPosition: (x: number, y: number) => void;
  setClockOffset: (offset: number) => void;
  setPartyName: (name: string) => void;
  reset: () => void;
}

export const usePartyStore = create<PartyState>((set) => ({
  partyMode: 'idle',
  connectionState: 'disconnected',
  discoveredHosts: [],
  connectedClients: [],
  listenerPosition: { x: 0.5, y: 0.5 },
  clockOffset: 0,
  partyName: '',
  
  setPartyMode: (partyMode) => set({ partyMode }),
  setConnectionState: (connectionState) => set({ connectionState }),
  setDiscoveredHosts: (discoveredHosts) => set({ discoveredHosts }),
  addDiscoveredHost: (host) => set((state) => {
    const exists = state.discoveredHosts.some(h => h.serviceName === host.serviceName);
    if (exists) {
      return {
        discoveredHosts: state.discoveredHosts.map(h => h.serviceName === host.serviceName ? host : h)
      };
    }
    return { discoveredHosts: [...state.discoveredHosts, host] };
  }),
  removeDiscoveredHost: (serviceName) => set((state) => ({
    discoveredHosts: state.discoveredHosts.filter(h => h.serviceName !== serviceName)
  })),
  setConnectedClients: (connectedClients) => set({ connectedClients }),
  updateClientPosition: (id, x, y) => set((state) => ({
    connectedClients: state.connectedClients.map((client) =>
      client.id === id ? { ...client, x, y } : client
    ),
  })),
  setListenerPosition: (x, y) => set({ listenerPosition: { x, y } }),
  setClockOffset: (clockOffset) => set({ clockOffset }),
  setPartyName: (partyName) => set({ partyName }),
  reset: () => set({
    partyMode: 'idle',
    connectionState: 'disconnected',
    discoveredHosts: [],
    connectedClients: [],
    listenerPosition: { x: 0.5, y: 0.5 },
    clockOffset: 0,
    partyName: '',
  }),
}));
