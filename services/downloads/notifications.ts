import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Innertube from '@/modules/innertube';
import { progressState } from './state';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

export async function showSystemNotification(title: string, body: string, id?: string) {
  try {
    await requestNotificationPermission();
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to trigger system notification', e);
  }
}

const lastLoggedPct: Record<string, number> = {};

function progressBarString(progress: number, length: number = 10): string {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const filledLength = Math.round(clampedProgress * length);
  const emptyLength = length - filledLength;
  const filled = '█'.repeat(Math.max(0, filledLength));
  const empty = '░'.repeat(Math.max(0, emptyLength));
  return `[${filled}${empty}]`;
}

export async function clearLoggedPct(trackId: string) {
  delete lastLoggedPct[trackId];
}

async function showProgressNotification(trackId: string, title: string, progress: number) {
  const pct = Math.round(progress * 100);
  const rounded = Math.floor(pct / 10) * 10;
  
  if (lastLoggedPct[trackId] === rounded) {
    return;
  }
  
  lastLoggedPct[trackId] = rounded;

  try {
    await requestNotificationPermission();
    const progressText = progressBarString(progress);
    const songInfo = progressState.totalDownloadCount > 1 ? ` (${progressState.currentDownloadIndex} of ${progressState.totalDownloadCount})` : '';
    await Notifications.scheduleNotificationAsync({
      identifier: `download-${trackId}`,
      content: {
        title: `Downloading Track${songInfo}`,
        body: `${progressText} ${pct}% - "${title}"`,
      },
      trigger: null,
    });
  } catch (e) {
    console.warn('Failed to update system progress notification', e);
  }
}

export async function updateDownloadNotification(
  type: 'progress' | 'complete' | 'paused' | 'cancelled' | 'failed',
  trackId: string,
  title: string,
  progress: number = 0,
  reason: string = ''
) {
  const notificationId = `download-${trackId}`;
  if (Platform.OS === 'android') {
    try {
      switch (type) {
        case 'progress':
          await Innertube.showDownloadProgressNotification(notificationId, title, progress, progressState.totalDownloadCount, progressState.currentDownloadIndex);
          break;
        case 'complete':
          await Innertube.showDownloadCompleteNotification(notificationId, title);
          break;
        case 'paused':
          await Innertube.showDownloadPausedNotification(notificationId, title);
          break;
        case 'cancelled':
          await Innertube.showDownloadCancelledNotification(notificationId);
          break;
        case 'failed':
          await Innertube.showDownloadFailedNotification(notificationId, title, reason);
          break;
      }
      return;
    } catch (err) {
      console.warn('Failed to show native Android download notification, falling back to expo-notifications', err);
    }
  }

  const songInfo = progressState.totalDownloadCount > 1 ? ` (${progressState.currentDownloadIndex} of ${progressState.totalDownloadCount})` : '';
  switch (type) {
    case 'progress':
      await showProgressNotification(trackId, title, progress);
      break;
    case 'complete':
      await showSystemNotification('Download Complete', `"${title}" has been saved offline.`, notificationId);
      break;
    case 'paused':
      await showSystemNotification('Download Paused', `Download for "${title}" is paused.`, notificationId);
      break;
    case 'cancelled':
      await showSystemNotification('Download Cancelled', 'The media download was cancelled.', notificationId);
      break;
    case 'failed':
      await showSystemNotification('Download Failed', `An error occurred while downloading "${title}". ${reason}`, notificationId);
      break;
  }
}
