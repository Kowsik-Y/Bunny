import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import packageJson from '../../package.json';

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
