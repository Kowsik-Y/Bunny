import { DeviceEventEmitter } from 'react-native';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export const TOAST_EVENT = 'bunny_show_toast';

export interface ToastPayload {
  message: string;
  type: ToastType;
  duration?: number;
}

export const toast = {
  show: (message: string, type: ToastType = 'info', duration = 3000) => {
    DeviceEventEmitter.emit(TOAST_EVENT, { message, type, duration });
  },
  success: (message: string, duration = 3000) => {
    DeviceEventEmitter.emit(TOAST_EVENT, { message, type: 'success', duration });
  },
  error: (message: string, duration = 3000) => {
    DeviceEventEmitter.emit(TOAST_EVENT, { message, type: 'error', duration });
  },
  info: (message: string, duration = 3000) => {
    DeviceEventEmitter.emit(TOAST_EVENT, { message, type: 'info', duration });
  },
  warning: (message: string, duration = 3000) => {
    DeviceEventEmitter.emit(TOAST_EVENT, { message, type: 'warning', duration });
  },
};
