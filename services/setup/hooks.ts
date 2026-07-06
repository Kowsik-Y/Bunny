import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import TrackPlayer, {
  useActiveTrack,
  usePlaybackState,
  useProgress,
  State,
  Event,
} from 'react-native-track-player';
import { type AppTrack } from '@/components/player/Tracks';
import { _isReady } from './state';
import { setupPlayer } from './player';

export function usePlayerReady(): boolean {
  const [ready, setReady] = useState(_isReady);

  useEffect(() => {
    if (_isReady) { setReady(true); return; }
    setupPlayer().then(() => setReady(true)).catch(() => {});
  }, []);

  return ready;
}

export function usePlayerState() {
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const isBuffering =
    playbackState.state === State.Buffering ||
    playbackState.state === State.Loading;
  return { isPlaying, isBuffering, playbackState: playbackState.state };
}

export function useCurrentTrack(): AppTrack | undefined {
  const active = useActiveTrack();
  const [current, setCurrent] = useState<AppTrack | undefined>(active as AppTrack | undefined);

  useEffect(() => {
    const t = setTimeout(() => {
      setCurrent(active as AppTrack | undefined);
    }, 80);
    return () => clearTimeout(t);
  }, [active]);

  return current;
}

export function usePlayerProgress() {
  const progress = useProgress(500);
  return progress;
}

export function useQueue(): AppTrack[] {
  const ready = usePlayerReady();
  const [queue, setQueue] = useState<AppTrack[]>([]);

  useEffect(() => {
    if (!ready) return;

    const updateQueue = () => {
      TrackPlayer.getQueue()
        .then((q) => {
          setQueue(q as AppTrack[]);
        })
        .catch((e) => console.warn('[SetupService] useQueue error:', e));
    };

    updateQueue();

    const subscription = DeviceEventEmitter.addListener('queue-changed', updateQueue);

    const trackChangeSubscription = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      updateQueue
    );

    const interval = setInterval(updateQueue, 5000);

    return () => {
      subscription.remove();
      trackChangeSubscription.remove();
      clearInterval(interval);
    };
  }, [ready]);

  return queue;
}

export function useActiveTrackIndex(): number {
  const ready = usePlayerReady();
  const [idx, setIdx] = useState<number>(0);

  useEffect(() => {
    if (!ready) return;
    TrackPlayer.getActiveTrackIndex().then((i) => setIdx(i ?? 0)).catch(() => {});
    const interval = setInterval(() => {
      TrackPlayer.getActiveTrackIndex().then((i) => setIdx(i ?? 0)).catch(() => {});
    }, 1000);
    return () => clearInterval(interval);
  }, [ready]);

  return idx;
}
