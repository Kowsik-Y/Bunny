import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { DeviceEventEmitter, View } from 'react-native';

export default function NotificationClickScreen() {
  const router = useRouter();

  useEffect(() => {
    // 1. Emit the global event to expand the player modal
    DeviceEventEmitter.emit('expand-player-modal');

    // 2. Instantly redirect back to the main tabs layout
    router.replace('/(tabs)');
  }, []);

  return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
}
