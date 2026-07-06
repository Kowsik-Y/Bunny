import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from 'react-native-track-player';
import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultTracks, { type AppTrack } from '@/components/player/Tracks';
import { _setupPromise, _isReady, setIsReady, setSetupPromise } from './state';

export async function setupPlayer(): Promise<void> {
  if (_isReady) return;
  if (_setupPromise) return _setupPromise;

  const promise = (async () => {
    await TrackPlayer.setupPlayer({ maxCacheSize: 1024 * 10 });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 0.5,
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
    });

    try {
      const persistedQueueRaw = await AsyncStorage.getItem('player-persisted-queue');
      const persistedIndexRaw = await AsyncStorage.getItem('player-persisted-index');
      const persistedPositionRaw = await AsyncStorage.getItem('player-persisted-position');

      const existingQueue = await TrackPlayer.getQueue();

      if (existingQueue.length > 0) {
        console.log('[SetupService] Player already has tracks in queue. Skipping restore.');
      } else if (persistedQueueRaw) {
        const persistedQueue = JSON.parse(persistedQueueRaw) as AppTrack[];
        if (persistedQueue.length > 0) {
          await TrackPlayer.add(persistedQueue);
          
          if (persistedIndexRaw) {
            const index = parseInt(persistedIndexRaw, 10);
            if (index >= 0 && index < persistedQueue.length) {
              await TrackPlayer.skip(index);
            }
          }
          if (persistedPositionRaw) {
            const position = parseFloat(persistedPositionRaw);
            if (position > 0) {
              await TrackPlayer.seekTo(position);
            }
          }
        }
      } else {
        if (defaultTracks.length > 0) {
          await TrackPlayer.add(defaultTracks);
        }
      }
      await TrackPlayer.pause();
    } catch (e) {
      console.warn('[SetupService] Failed to restore persisted player state:', e);
      const queue = await TrackPlayer.getQueue();
      if (queue.length === 0 && defaultTracks.length > 0) {
        await TrackPlayer.add(defaultTracks);
      }
      try {
        await TrackPlayer.pause();
      } catch (_) {}
    }

    setIsReady(true);
  })();

  setSetupPromise(promise);
  return promise;
}
