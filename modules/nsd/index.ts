import { requireNativeModule, EventEmitter } from 'expo';

export interface NsdService {
  serviceName: string;
  serviceType: string;
  ip: string;
  port: number;
}

export interface NsdNative {
  startDiscovery(serviceType: string): Promise<boolean>;
  stopDiscovery(): Promise<boolean>;
  registerService(serviceName: string, port: number): Promise<boolean>;
  unregisterService(): Promise<boolean>;
}

const NsdModule = requireNativeModule<any>('Nsd');
const emitter = new EventEmitter(NsdModule as any) as any;

export interface NsdEventMap {
  onServiceRegistered: (event: { serviceName: string }) => void;
  onServiceUnregistered: () => void;
  onRegistrationFailed: (event: { errorCode: number }) => void;
  onUnregistrationFailed: (event: { errorCode: number }) => void;
  onDiscoveryStarted: (event: { serviceType: string }) => void;
  onDiscoveryStopped: (event: { serviceType: string }) => void;
  onDiscoveryFailed: (event: { errorCode: number }) => void;
  onServiceResolved: (event: NsdService) => void;
  onServiceLost: (event: { serviceName: string; serviceType: string }) => void;
}

export function addNsdListener<T extends keyof NsdEventMap>(
  eventName: T,
  listener: NsdEventMap[T]
) {
  return (emitter as any).addListener(eventName, listener);
}

export default NsdModule;
