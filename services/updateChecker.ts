import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import packageJson from '../package.json';

export async function checkAppUpdates(silent = false) {
  try {
    // If silent startup check, verify if auto-update is enabled
    if (silent) {
      const autoCheckStored = await AsyncStorage.getItem('@bunny_auto_check_updates');
      if (autoCheckStored === 'false') {
        return; // Auto-update checks are disabled by the user
      }
    }

    const response = await fetch('https://api.github.com/repos/Kowsik-Y/Bunny/releases/latest');
    if (!response.ok) {
      throw new Error('Failed to fetch release info');
    }
    const data = await response.json();
    const latestTag = data.tag_name; // E.g., "v1.0.1" or "1.0.1"
    const cleanLatest = latestTag.replace(/^v/, ''); // Clean "v" prefix if any
    const cleanCurrent = packageJson.version; // E.g. "1.0.0"

    // Parse versions
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
      // Find APK asset url
      const apkAsset = data.assets?.find((a: any) => a.name.endsWith('.apk'));
      const downloadUrl = apkAsset ? apkAsset.browser_download_url : data.html_url;

      Alert.alert(
        'Update Available',
        `A new version (${latestTag}) of Bunny is available! Your current version is ${packageJson.version}.\n\nWould you like to download the update now?`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Download Now', onPress: () => Linking.openURL(downloadUrl) }
        ]
      );
    } else if (!silent) {
      Alert.alert('App Update', 'Your app is up to date! (Version ' + packageJson.version + ')');
    }
  } catch (e) {
    console.warn('Update check failed:', e);
    if (!silent) {
      Alert.alert('Error', 'Failed to check for updates. Please try again later.');
    }
  }
}
