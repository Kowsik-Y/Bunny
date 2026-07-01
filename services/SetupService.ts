import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import TrackPlayer, {
  useActiveTrack,
  usePlaybackState,
  useProgress,
  State,
  Capability,
  Event,
} from 'react-native-track-player';
import tracks, { type AppTrack } from '@/components/player/Tracks';
import { resolveAudio } from './useYouTubeAudio';   // ← ADD THIS
import { getLocalDownloadUri } from './downloads';

// ─── TrackPlayer Queue Decorators for Instant Events ───────────────────────
const originalAdd = TrackPlayer.add;
TrackPlayer.add = async function (tracks: any, insertBeforeIndex?: number) {
  const res = await originalAdd(tracks, insertBeforeIndex);
  DeviceEventEmitter.emit('queue-changed');
  return res;
};

const originalRemove = TrackPlayer.remove;
TrackPlayer.remove = async function (index: any) {
  const res = await originalRemove(index);
  DeviceEventEmitter.emit('queue-changed');
  return res;
};

const originalReset = TrackPlayer.reset;
TrackPlayer.reset = async function () {
  const res = await originalReset();
  DeviceEventEmitter.emit('queue-changed');
  return res;
};


// ─── Global init flag ─────────────────────────────────────────────────────────
// Shared across the module so multiple callers never double-init.
let _setupPromise: Promise<void> | null = null;
let _isReady = false;

export async function setupPlayer(): Promise<void> {
  // Return existing promise if already in progress or done
  if (_isReady) return;
  if (_setupPromise) return _setupPromise;

  _setupPromise = (async () => {
    await TrackPlayer.setupPlayer({ maxCacheSize: 1024 * 10 });

    await TrackPlayer.updateOptions({
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
      progressUpdateEventInterval: 0.5, // seconds
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
    });

    // Seed queue only when empty (avoid duplicate adds on hot reload)
    const queue = await TrackPlayer.getQueue();
    if (queue.length === 0 && tracks.length > 0) {
      await TrackPlayer.add(tracks);
    }

    _isReady = true;
  })();

  return _setupPromise;
}

// ─── Hook: guard all RNTP hooks behind readiness ──────────────────────────────
// useActiveTrack / usePlaybackState / useProgress all throw if the player
// isn't initialized. This hook tells consumers when it's safe to use them.
export function usePlayerReady(): boolean {
  const [ready, setReady] = useState(_isReady);

  useEffect(() => {
    if (_isReady) { setReady(true); return; }
    setupPlayer().then(() => setReady(true)).catch(() => {});
  }, []);

  return ready;
}

// ─── usePlayerState ──────────────────────────────────────────────────────────
export function usePlayerState() {
  // usePlaybackState returns { state: State.None } when the player isn't ready,
  // so the extra ready guard just causes a race condition where isPlaying is
  // always false even when the player is already playing.
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const isBuffering =
    playbackState.state === State.Buffering ||
    playbackState.state === State.Loading;
  return { isPlaying, isBuffering, playbackState: playbackState.state };
}

// ─── useCurrentTrack ──────────────────────────────────────────────────────────
export function useCurrentTrack(): AppTrack | undefined {
  // useActiveTrack returns undefined when there's no active track, so we don't
  // need the extra ready guard (which causes a race condition on cold start).
  const active = useActiveTrack();
  return active as AppTrack | undefined;
}

// ─── usePlayerProgress ────────────────────────────────────────────────────────
export function usePlayerProgress() {
  const progress = useProgress(500);
  return progress;
}

// ─── useQueue ─────────────────────────────────────────────────────────────────
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

    // Initial load
    updateQueue();

    // Listen to custom queue-changed event
    const subscription = DeviceEventEmitter.addListener('queue-changed', updateQueue);

    // Also listen to active track changes in case the queue indices update
    const trackChangeSubscription = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      updateQueue
    );

    // Bounded safety polling every 5s just as a backup
    const interval = setInterval(updateQueue, 5000);

    return () => {
      subscription.remove();
      trackChangeSubscription.remove();
      clearInterval(interval);
    };
  }, [ready]);

  return queue;
}

// ─── useActiveTrackIndex ──────────────────────────────────────────────────────
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

// ─── Player actions ───────────────────────────────────────────────────────────
export const PlayerActions = {
  playPause: async (isPlaying: boolean) => {
    // Read live RNTP state instead of trusting the stale React prop,
    // so the toggle is always correct regardless of render timing.
    try {
      const state = await TrackPlayer.getPlaybackState();
      if (state.state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch {
      // Fallback to the prop if getPlaybackState throws (player not ready)
      if (isPlaying) await TrackPlayer.pause();
      else await TrackPlayer.play();
    }
  },

  next: () => TrackPlayer.skipToNext(),
  previous: () => TrackPlayer.skipToPrevious(),
  seekTo: (position: number) => TrackPlayer.seekTo(position),

  addTrack: async (track: AppTrack, playNow = false) => {
    const localUri = await getLocalDownloadUri(track.id);
    const trackWithUrl = localUri ? { ...track, url: localUri } : track;
    await TrackPlayer.add([trackWithUrl]);
    if (playNow) {
      await PlayerActions.skipToTrack(String(track.id));
    }
  },

  addTracks: async (tracks: AppTrack[]) => {
    if (tracks.length === 0) return;
    const tracksWithUrls = [];
    for (const t of tracks) {
      const localUri = await getLocalDownloadUri(t.id);
      tracksWithUrls.push(localUri ? { ...t, url: localUri } : t);
    }
    await TrackPlayer.add(tracksWithUrls);
  },

  playCollection: async (tracks: AppTrack[]) => {
    if (tracks.length === 0) return;
    await TrackPlayer.reset();
    const tracksWithUrls = [];
    for (const t of tracks) {
      const localUri = await getLocalDownloadUri(t.id);
      tracksWithUrls.push(localUri ? { ...t, url: localUri } : t);
    }
    await TrackPlayer.add(tracksWithUrls);
    await TrackPlayer.play();
  },

  skipToTrack: async (trackId: string) => {
    const queue = await TrackPlayer.getQueue();
    const idx = queue.findIndex((t) => String(t.id) === String(trackId));
    if (idx >= 0) {
      await TrackPlayer.skip(idx);
      await TrackPlayer.play();
    }
  },

  skipToTrackFromYt: async (ytTrack: any) => {
    const queue = await TrackPlayer.getQueue();

    const idx = queue.findIndex((t) => String(t.id) === String(ytTrack.id));
    if (idx >= 0) {
      await TrackPlayer.skip(idx);
      await TrackPlayer.play();
      return;
    }

    try {
      const localUri = await getLocalDownloadUri(ytTrack.id);
      if (localUri) {
        const newTrack: AppTrack = {
          id:       ytTrack.id,
          url:      localUri,
          title:    ytTrack.title || 'Unknown',
          artist:   ytTrack.artist || 'Unknown Artist',
          album:    ytTrack.album || 'YouTube Music',
          duration: ytTrack.duration || 0,
          artwork:  ytTrack.thumbnail || ytTrack.artwork || 'https://picsum.photos/400/400',
          artistId: ytTrack.artistId || ytTrack.authorId || undefined,
        };
        await TrackPlayer.add([newTrack]);
        const newQueue = await TrackPlayer.getQueue();
        await TrackPlayer.skip(newQueue.length - 1);
        await TrackPlayer.play();
        return;
      }

      const result = await resolveAudio(ytTrack.id);

      const newTrack: AppTrack = {
        id:       ytTrack.id,
        url:      result.track.url,
        title:    result.title    || ytTrack.title   || 'Unknown',
        artist:   result.artist   || ytTrack.artist  || 'Unknown Artist',
        album:    ytTrack.album   || 'YouTube Music',
        duration: result.duration || ytTrack.duration || 0,
        artwork:  result.thumbnail || ytTrack.thumbnail || 'https://picsum.photos/400/400',
        headers:  result.track.headers,   // ← User-Agent for ExoPlayer
        userAgent: result.track.userAgent,
        videoUrl: result.videoUrl ?? undefined,
        artistId: result.track.artistId || ytTrack.artistId || ytTrack.authorId || undefined,
        allAudio: result.track.allAudio || undefined,
        activeItag: result.track.activeItag || undefined,
        allVideo: result.track.allVideo || undefined,
        activeVideoItag: result.track.activeVideoItag || undefined,
      };

      await TrackPlayer.add([newTrack]);
      const newQueue = await TrackPlayer.getQueue();
      await TrackPlayer.skip(newQueue.length - 1);
      await TrackPlayer.play();

    } catch (err) {
      console.error('Failed to resolve YouTube track:', err);
      throw err;
    }
  },

  setVolume: (vol: number) => TrackPlayer.setVolume(vol),
  setRate: (rate: number) => TrackPlayer.setRate(rate),
};
