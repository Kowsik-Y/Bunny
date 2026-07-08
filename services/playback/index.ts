import TrackPlayer, { Event, State } from 'react-native-track-player';
import { resolveAudio } from '../useYouTubeAudio';
import { savePlayerActiveTrack, savePlayerPosition } from '../SetupService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchLyricsFromApis } from '../lyrics';
import { toast } from '../toast';
import { trimHistory } from './trim';
import { getRadioQueue } from './radio';
import { SleepTimerManager } from '../sleepTimer';

const retryCounts = new Map<string, number>();
let lastTrackId: string | undefined = undefined;

let isFetchingRadio = false;
const radioFetchedForId = new Set<string>();

let suppressNextAutoPlay = false;
export function setVideoQualityChanging(value: boolean) {
  suppressNextAutoPlay = value;
}

let isCrossfadeEnabled = false;
let crossfadeDurationSec = 3;
let fadeInTimer: any = null;
let fadeOutTimer: any = null;
let fadeOutTriggeredForTrack: string | null = null;
let skipTriggeredForTrack: string | null = null;

async function loadCrossfadePrefs() {
  try {
    const raw = await AsyncStorage.getItem('app-theme-preferences');
    if (raw) {
      const parsed = JSON.parse(raw);
      isCrossfadeEnabled = !!parsed.crossfadeEnabled;
      crossfadeDurationSec = typeof parsed.crossfadeDuration === 'number' ? parsed.crossfadeDuration : 3;
    }
  } catch (_) {}
}

function executeFadeIn() {
  if (fadeInTimer) clearInterval(fadeInTimer);
  if (fadeOutTimer) {
    clearInterval(fadeOutTimer);
    fadeOutTimer = null;
  }
  
  let vol = 0;
  TrackPlayer.setVolume(vol).catch(() => {});
  
  const intervalTime = 50;
  const steps = (crossfadeDurationSec * 1000) / intervalTime;
  const delta = 1.0 / (steps > 0 ? steps : 1);
  
  fadeInTimer = setInterval(async () => {
    vol += delta;
    if (vol >= 1.0) {
      vol = 1.0;
      clearInterval(fadeInTimer);
      fadeInTimer = null;
    }
    TrackPlayer.setVolume(vol).catch(() => {});
  }, intervalTime);
}

function executeFadeOut(remainingTime: number) {
  if (fadeOutTimer) clearInterval(fadeOutTimer);
  if (fadeInTimer) {
    clearInterval(fadeInTimer);
    fadeInTimer = null;
  }
  
  let vol = 1.0;
  const intervalTime = 50;
  const steps = (remainingTime * 1000) / intervalTime;
  const delta = 1.0 / (steps > 0 ? steps : 1);
  
  fadeOutTimer = setInterval(async () => {
    vol -= delta;
    if (vol <= 0.0) {
      vol = 0.0;
      clearInterval(fadeOutTimer);
      fadeOutTimer = null;
    }
    TrackPlayer.setVolume(vol).catch(() => {});
  }, intervalTime);
}

export async function PlaybackService() {
  loadCrossfadePrefs().catch(() => {});
  let lastPosition = 0;

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    TrackPlayer.seekBy(event.interval);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    TrackPlayer.seekBy(-event.interval);
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.permanent) {
      TrackPlayer.pause();
    } else if (event.paused) {
      TrackPlayer.setVolume(0.5);
    } else {
      TrackPlayer.setVolume(1);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.reset();
  });

  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
  });

  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
    const currentId = event.track?.id;
    console.log('Track changed ->', event.track?.title,
      '| current ID:', currentId,
      '| last ID:', lastTrackId
    );
    if (currentId && lastTrackId && lastTrackId !== currentId) {
      console.log('[PlaybackService] Resetting retry count for', currentId);
      retryCounts.delete(currentId);
      SleepTimerManager.getInstance().handlePlaybackStateOrTrackChange();
    }
    lastTrackId = currentId;

    fadeOutTriggeredForTrack = null;
    skipTriggeredForTrack = null;
    await loadCrossfadePrefs();
    if (isCrossfadeEnabled && currentId) {
      executeFadeIn();
    }

    const idx = await TrackPlayer.getActiveTrackIndex();
    if (typeof idx === 'number') {
      savePlayerActiveTrack(idx);
    }

    if (currentId) {
      setTimeout(async () => {
        try {
          const queue = await TrackPlayer.getQueue();
          const activeIndex = await TrackPlayer.getActiveTrackIndex();
          if (activeIndex === undefined || activeIndex === null) return;

          const currentTrack = queue[activeIndex];
          if (!currentTrack || String(currentTrack.id) !== String(currentId)) {
            console.log('[PlaybackService] Track changed during defer. Skipping resolution.');
            return;
          }

          const currentActiveTrack = currentTrack;
          if (currentActiveTrack && currentActiveTrack.url && currentActiveTrack.url.toString().includes('dummy.com')) {
            console.log(`[PlaybackService] Active track is a placeholder: ${currentActiveTrack.title}. Resolving immediately...`);
            
            const stateBeforeResolve = await TrackPlayer.getState();
            const wasPlayingBeforeResolve = stateBeforeResolve === State.Playing || stateBeforeResolve === State.Buffering;

            resolveAudio(String(currentActiveTrack.id))
              .then(async (resolved) => {
                const liveActiveIndex = await TrackPlayer.getActiveTrackIndex();
                if (typeof liveActiveIndex === 'number' && liveActiveIndex === activeIndex) {
                  const latestQueue = await TrackPlayer.getQueue();
                  const targetOriginal = latestQueue[liveActiveIndex];
                  if (targetOriginal && String(targetOriginal.id) === String(currentActiveTrack.id)) {
                    const updatedTrack = {
                      ...targetOriginal,
                      url: resolved.track.url,
                      videoUrl: resolved.videoUrl ?? undefined,
                      headers: resolved.track.headers,
                      userAgent: resolved.track.userAgent,
                      artistId: resolved.track.artistId ?? targetOriginal.artistId,
                      albumId: (resolved.track as any).albumId ?? targetOriginal.albumId,
                      artists: (resolved.track as any).artists ?? targetOriginal.artists,
                      allAudio: resolved.track.allAudio,
                      activeItag: resolved.track.activeItag,
                      allVideo: resolved.track.allVideo,
                      activeVideoItag: resolved.track.activeVideoItag,
                    };
                    
                    const progress = await TrackPlayer.getProgress();
                    const position = progress.position;

                    await TrackPlayer.add([updatedTrack], liveActiveIndex);
                    await TrackPlayer.skip(liveActiveIndex);
                    await TrackPlayer.remove(liveActiveIndex + 1);
                    
                    if (position > 0) {
                      await TrackPlayer.seekTo(position);
                    }
                    if (wasPlayingBeforeResolve && !suppressNextAutoPlay) {
                      await TrackPlayer.play();
                    } else {
                      suppressNextAutoPlay = false;
                      console.log('[PlaybackService] Suppressed auto-play (initially paused or app opening).');
                    }
                    console.log(`[PlaybackService] Active track resolution complete: ${currentActiveTrack.title}`);
                  }
                }
              })
              .catch((err) => {
                console.warn(`[PlaybackService] Active track resolution failed for ${currentActiveTrack.title}:`, err.message);
              });
          }

          const isYtTrack = currentId.length === 11 || currentActiveTrack?.album === 'YouTube Music' || currentActiveTrack?.album === 'Single' || currentActiveTrack?.url?.toString().includes('googlevideo.com') || currentActiveTrack?.url?.toString().includes('dummy.com');
          const tracksLeft = queue.length - 1 - activeIndex;

          if (
            isYtTrack &&
            tracksLeft <= 0 &&
            !isFetchingRadio &&
            !radioFetchedForId.has(currentId)
          ) {
            isFetchingRadio = true;
            radioFetchedForId.add(currentId);
            console.log(`[PlaybackService] At last track of queue (${tracksLeft} left). Fetching radio queue for: ${currentActiveTrack?.title}`);

            const latestQueue = await TrackPlayer.getQueue();
            const lastRealTrack = [...latestQueue]
              .reverse()
              .find((t) => t.id && String(t.id).length === 11 && !String(t.url).includes('dummy.com'));
            const seedId = lastRealTrack?.id ? String(lastRealTrack.id) : currentId;

            getRadioQueue(seedId, 3)
              .then(async (tracksToAdd) => {
                if (tracksToAdd.length > 0) {
                  const queueNow = await TrackPlayer.getQueue();
                  const existingIds = new Set(queueNow.map((t) => String(t.id)));
                  const fresh = tracksToAdd.filter((t) => !existingIds.has(t.id));
                  if (fresh.length > 0) {
                    await TrackPlayer.add(fresh);
                    console.log(`[PlaybackService] Autoplay: Added ${fresh.length} radio tracks to queue.`);
                  } else {
                    console.log('[PlaybackService] Autoplay: All radio tracks already in queue.');
                  }
                } else {
                  console.log('[PlaybackService] Autoplay: Radio queue returned 0 tracks.');
                }
              })
              .catch((err) => {
                console.warn('[PlaybackService] Autoplay radio fetch failed:', err.message);
              })
              .finally(() => {
                isFetchingRadio = false;
              });
          }

          let preResolveLimit = 2;
          let lyricsPrefetch = false;
          try {
            const rawPrefs = await AsyncStorage.getItem('app-theme-preferences');
            if (rawPrefs) {
              const parsed = JSON.parse(rawPrefs);
              if (typeof parsed.preResolveLimit === 'number') {
                preResolveLimit = parsed.preResolveLimit;
              }
              if (typeof parsed.lyricsPrefetch === 'boolean') {
                lyricsPrefetch = parsed.lyricsPrefetch;
              }
            }
          } catch (_) {}

          trimHistory().catch(() => {});

          const updatedQueue = await TrackPlayer.getQueue();

          const preResolveAt = async (targetIndex: number) => {
            if (targetIndex >= updatedQueue.length) return;
            const targetTrack = updatedQueue[targetIndex];
            if (!targetTrack || !targetTrack.url || !targetTrack.url.toString().includes('dummy.com')) return;

            console.log(`[PlaybackService] Pre-resolving track at index ${targetIndex}: ${targetTrack.title}...`);
            
            if (lyricsPrefetch && targetTrack.title && targetTrack.artist) {
              console.log(`[PlaybackService] Pre-fetching lyrics for: ${targetTrack.title}`);
              fetchLyricsFromApis(
                targetTrack.title,
                targetTrack.artist,
                targetTrack.duration || 0,
                String(targetTrack.id)
              ).catch(() => {});
            }

            resolveAudio(String(targetTrack.id))
              .then(async (resolved) => {
                const currentActive = await TrackPlayer.getActiveTrackIndex();
                if (currentActive !== undefined && currentActive < targetIndex) {
                  const latestQueue = await TrackPlayer.getQueue();
                  const targetOriginal = latestQueue[targetIndex];
                  if (targetOriginal && String(targetOriginal.id) === String(targetTrack.id)) {
                    const updatedTrack = {
                      ...targetOriginal,
                      url: resolved.track.url,
                      videoUrl: resolved.videoUrl ?? undefined,
                      headers: resolved.track.headers,
                      userAgent: resolved.track.userAgent,
                      artistId: resolved.track.artistId ?? targetOriginal.artistId,
                      albumId: (resolved.track as any).albumId ?? targetOriginal.albumId,
                      artists: (resolved.track as any).artists ?? targetOriginal.artists,
                      allAudio: resolved.track.allAudio,
                      activeItag: resolved.track.activeItag,
                      allVideo: resolved.track.allVideo,
                      activeVideoItag: resolved.track.activeVideoItag,
                    };
                    await TrackPlayer.add([updatedTrack], targetIndex);
                    await TrackPlayer.remove(targetIndex + 1);
                    console.log(`[PlaybackService] Pre-resolution complete for track at index ${targetIndex}: ${targetTrack.title}`);
                  }
                }
              })
              .catch((err) => {
                console.warn(`[PlaybackService] Pre-resolution failed for ${targetTrack.title}:`, err.message);
              });
          };

          for (let k = 1; k <= preResolveLimit; k++) {
            const targetIndex = activeIndex + k;
            const delay = (k - 1) * 3000;
            if (delay === 0) {
              preResolveAt(targetIndex);
            } else {
              setTimeout(() => preResolveAt(targetIndex), delay);
            }
          }

        } catch (err: any) {
          console.warn('[PlaybackService] Autoplay/Pre-resolve failed during deferred execute:', err.message);
        }
      }, 150);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async (event) => {
    savePlayerPosition(event.position);

    // Detect loop/restart (when position jumps back to 0 or starts over)
    if (event.position < lastPosition && lastPosition > event.duration - 5) {
      console.log('[PlaybackService] Loop/restart detected. Position reset from', lastPosition, 'to', event.position);
      fadeOutTriggeredForTrack = null;
      skipTriggeredForTrack = null;
      if (isCrossfadeEnabled) {
        executeFadeIn();
      } else {
        TrackPlayer.setVolume(1.0).catch(() => {});
      }
    }
    lastPosition = event.position;

    if (isCrossfadeEnabled && event.duration > 0) {
      const remaining = event.duration - event.position;

      // 1. Trigger Fade Out
      if (remaining <= crossfadeDurationSec) {
        const active = await TrackPlayer.getActiveTrack();
        if (active && active.id && fadeOutTriggeredForTrack !== active.id) {
          fadeOutTriggeredForTrack = active.id;
          executeFadeOut(remaining);
        }
      }

      // 2. Trigger Early Skip (0.8s remaining) to mix seamlessly
      if (remaining <= 0.8) {
        const active = await TrackPlayer.getActiveTrack();
        if (active && active.id && skipTriggeredForTrack !== active.id) {
          skipTriggeredForTrack = active.id;
          const queue = await TrackPlayer.getQueue();
          const activeIndex = await TrackPlayer.getActiveTrackIndex();
          if (activeIndex !== undefined && activeIndex < queue.length - 1) {
            console.log('[PlaybackService] Cross song mix: skipping early to next track.');
            await TrackPlayer.skipToNext();
            await TrackPlayer.play();
          }
        }
      }
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
    console.log('Playback state ->', event.state);
    if (event.state === State.Error && 'error' in event && event.error) {
      console.error('Playback state error ->', event.error.code, event.error.message);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackError, async (event) => {
    console.error('Playback error ->', event.code, event.message);

    toast.error('Network issue or timeout occurred. Attempting to refresh...', 3500);

    let activeTrack: any = null;
    let isActiveDummy = false;
    try {
      activeTrack = await TrackPlayer.getActiveTrack();
      isActiveDummy = activeTrack && activeTrack.url?.toString().includes('dummy.com');
    } catch (_) {}

    const isHttpError =
      event.code === 'android-io-bad-http-status' ||
      event.message?.toLowerCase().includes('http status') ||
      event.message?.toLowerCase().includes('403') ||
      event.message?.toLowerCase().includes('source error') ||
      isActiveDummy;

    if (isHttpError && activeTrack) {
      try {
        if (activeTrack.id) {
          const trackId = activeTrack.id;
          const attempts = retryCounts.get(trackId) || 0;
          if (attempts >= 2) {
            console.warn(`[PlaybackService] Exceeded retry limit for track: ${activeTrack.title}. Skipping to next...`);
            retryCounts.delete(trackId);
            await TrackPlayer.skipToNext();
            return;
          }
          retryCounts.set(trackId, attempts + 1);

          const stateBeforeResolve = await TrackPlayer.getState();
          const wasPlayingBeforeResolve = stateBeforeResolve === State.Playing || stateBeforeResolve === State.Buffering;

          const isYtTrack = activeTrack.id.length === 11 || activeTrack.album === 'YouTube Music' || activeTrack.album === 'Single' || activeTrack.url?.toString().includes('googlevideo.com') || activeTrack.url?.toString().includes('dummy.com');
          if (isYtTrack) {
            console.log(`[PlaybackService] Bad HTTP status or Source error on track ${activeTrack.title}. Refreshing stream URL (attempt ${attempts + 1}/2)...`);
            const forcePiped = attempts > 0;
            const resolved = await resolveAudio(activeTrack.id, forcePiped);
            const activeIndex = await TrackPlayer.getActiveTrackIndex();
            if (activeIndex !== undefined && activeIndex !== null && activeIndex >= 0) {
              const queue = await TrackPlayer.getQueue();
              const originalTrack = queue[activeIndex];

              const progress = await TrackPlayer.getProgress();
              const position = progress.position;

              const updatedTrack = {
                ...originalTrack,
                url: resolved.track.url,
                videoUrl: resolved.videoUrl ?? undefined,
                headers: resolved.track.headers,
                userAgent: resolved.track.userAgent,
                artistId: originalTrack.artistId ?? resolved.track.artistId,
                albumId: originalTrack.albumId ?? (resolved.track as any).albumId,
                artists: originalTrack.artists ?? (resolved.track as any).artists,
                allAudio: resolved.track.allAudio,
                activeItag: resolved.track.activeItag,
                allVideo: resolved.track.allVideo,
                activeVideoItag: resolved.track.activeVideoItag,
              };
              await TrackPlayer.add([updatedTrack], activeIndex);
              await TrackPlayer.skip(activeIndex);
              await TrackPlayer.remove(activeIndex + 1); 
              if (position > 0) {
                console.log(`[PlaybackService] Seeking to last known position: ${position.toFixed(1)}s`);
                await TrackPlayer.seekTo(position);
              }
              if (wasPlayingBeforeResolve) {
                await TrackPlayer.play();
              } else {
                console.log('[PlaybackService] Recovery complete. Player was paused, keeping paused.');
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('[PlaybackService] Failed to recover track playback:', err.message);
      }
    }
  });
}
