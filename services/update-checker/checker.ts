import { DeviceEventEmitter, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import packageJson from '../../package.json';
import { showSystemNotification } from '../downloads/notifications';

export async function checkAppUpdates(silent = false) {
  try {
    if (silent) {
      const autoCheckStored = await AsyncStorage.getItem('@bunny_auto_check_updates');
      if (autoCheckStored === 'false') {
        return;
      }
    }

    const response = await fetch('https://api.github.com/repos/Kowsik-Y/Bunny/releases/latest');
    if (!response.ok) {
      throw new Error('Failed to fetch release info');
    }
    const data = await response.json();
    const latestTag = data.tag_name;
    const cleanLatest = latestTag.replace(/^v/, '');
    const cleanCurrent = packageJson.version;

    const latestParts = cleanLatest.split('.').map(Number);
    const currentParts = cleanCurrent.split('.').map(Number);
    
    let isNewer = false;
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      if (l > c) {
        isNewer = true;
        break;
      } else if (l < c) {
        break;
      }
    }

    if (isNewer) {
      const apkAsset = data.assets?.find((a: any) => a.name.endsWith('.apk'));
      const downloadUrl = apkAsset ? apkAsset.browser_download_url : data.html_url;

      DeviceEventEmitter.emit('show_app_alert', {
        title: 'Update Available',
        description: `A new version (${latestTag}) of Bunny is available! Your current version is ${packageJson.version}.\n\nWould you like to download the update now?`,
        confirmText: 'Download Now',
        cancelText: 'Later',
        onConfirm: () => Linking.openURL(downloadUrl)
      });

      // Show system push notification if enabled
      try {
        const rawPrefs = await AsyncStorage.getItem('app-theme-preferences');
        let updateNotifEnabled = true;
        if (rawPrefs) {
          const prefs = JSON.parse(rawPrefs);
          if (prefs.updateNotificationsEnabled === false) {
            updateNotifEnabled = false;
          }
        }

        if (updateNotifEnabled) {
          await showSystemNotification(
            'Update Available',
            `A new version (${latestTag}) of Bunny is available! Tap to check it out.`,
            'app-update'
          );
        }
      } catch (err) {
        console.warn('Failed to send update notification:', err);
      }
    } else if (!silent) {
      DeviceEventEmitter.emit('show_app_alert', {
        title: 'App Update',
        description: 'Your app is up to date! (Version ' + packageJson.version + ')',
        confirmText: 'OK',
        cancelText: null
      });
    }
  } catch (e) {
    console.warn('Update check failed:', e);
    if (!silent) {
      DeviceEventEmitter.emit('show_app_alert', {
        title: 'Error',
        description: 'Failed to check for updates. Please try again later.',
        confirmText: 'OK',
        cancelText: null
      });
    }
  }
}
