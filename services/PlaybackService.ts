import TrackPlayer, { Event, State } from 'react-native-track-player';
import { resolveAudio } from './useYouTubeAudio';
import { type AppTrack } from '@/components/player/Tracks';
import { toast } from './toast';
import { savePlayerActiveTrack, savePlayerPosition } from './SetupService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchLyricsFromApis } from './lyrics';

// Keep track of retry attempts per track ID to prevent infinite loops
const retryCounts = new Map<string, number>();
let lastTrackId: string | undefined = undefined;

// Prevent concurrent or duplicate radio queue fetches
let isFetchingRadio = false;
const radioFetchedForId = new Set<string>();

/**
 * Maximum number of "history" (already-played) tracks to keep in the queue.
 * Older tracks beyond this limit are automatically removed from the front
 * to prevent unbounded queue growth. Dynamically scales: if the user has
 * more than 50 total tracks queued, shrink the history cap proportionally.
 */
const BASE_HISTORY_LIMIT = 10;

async function trimHistory(): Promise<void> {
  try {
    const queue = await TrackPlayer.getQueue();
    const activeIndex = await TrackPlayer.getActiveTrackIndex();
    if (activeIndex === undefined || activeIndex === null || activeIndex <= 0) return;

    // Dynamic cap: shrink history when overall queue is large to avoid RAM pressure.
    // Formula: cap = max(5, BASE_HISTORY_LIMIT - floor(queueSize / 10))
    const dynamicCap = Math.max(5, BASE_HISTORY_LIMIT - Math.floor(queue.length / 10));
    const historyCount = activeIndex; // tracks before the active one

    if (historyCount > dynamicCap) {
      const toRemove = historyCount - dynamicCap;
      // Remove from index 0 up, but do it in reverse-index order so indices don't shift
      const indices = Array.from({ length: toRemove }, (_, i) => i);
      for (const idx of indices) {
        await TrackPlayer.remove(0);
      }
      console.log(`[PlaybackService] History trimmed: removed ${toRemove} old tracks (cap=${dynamicCap}).`);
    }
  } catch (e: any) {
    console.warn('[PlaybackService] trimHistory failed:', e.message);
  }
}

/**
 * When true, the next PlaybackActiveTrackChanged event will NOT call
 * TrackPlayer.play(). Used by changeVideoQuality to prevent TrackPlayer from
 * stealing audio focus from expo-video when the queue is updated for the
 * sole purpose of persisting the new videoUrl.
 */
let suppressNextAutoPlay = false;
export function setVideoQualityChanging(value: boolean) {
  suppressNextAutoPlay = value;
}

/**
 * Fetch a YouTube radio / "Up Next" queue for a given videoId.
 * Uses the same RDAMVM{videoId} playlist trick that Echo-Music uses internally
 * via YouTube Music's /next endpoint (WEB_REMIX client).
 * Returns up to `limit` track stubs (with dummy URLs to be resolved on playback).
 */
async function getRadioQueue(videoId: string, limit = 10): Promise<AppTrack[]> {
  try {
    const body = {
      videoId,
      playlistId: `RDAMVM${videoId}`,
      context: {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: '1.20250101.01.00',
          hl: 'en',
          gl: 'US',
        },
      },
      enablePersistentPlaylistPanel: true,
      isAudioOnly: true,
      tunerSettingValue: 'AUTOMIX_SETTING_NORMAL',
    };

    const res = await fetch(
      'https://music.youtube.com/youtubei/v1/next?prettyPrint=false',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
          'X-YouTube-Client-Name': '67',
          'X-YouTube-Client-Version': '1.20250101.01.00',
          Origin: 'https://music.youtube.com',
          Referer: 'https://music.youtube.com/',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Walk the nested response to find the playlist panel items
    const panels: any[] =
      data?.contents?.singleColumnMusicWatchNextResultsRenderer
        ?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]
        ?.tabRenderer?.content?.musicQueueRenderer?.content
        ?.playlistPanelRenderer?.contents ?? [];

    const tracks: AppTrack[] = [];

    for (const panel of panels) {
      const item = panel?.playlistPanelVideoRenderer;
      if (!item) continue;

      const id: string = item.videoId;
      if (!id || id === videoId) continue; // skip self

      const title: string = item.title?.runs?.[0]?.text ?? 'Unknown';
      const artist: string =
        item.shortBylineText?.runs?.[0]?.text ??
        item.longBylineText?.runs?.[0]?.text ??
        'Unknown Artist';

      // Pick the highest resolution thumbnail
      const thumbs: any[] = item.thumbnail?.thumbnails ?? [];
      const artwork: string =
        thumbs[thumbs.length - 1]?.url ?? 'https://picsum.photos/400/400';

      // duration in seconds from durationText "M:SS"
      const durationText: string = item.lengthText?.runs?.[0]?.text ?? '0:00';
      const parts = durationText.split(':').map(Number);
      const duration = parts.length === 2
        ? (parts[0] || 0) * 60 + (parts[1] || 0)
        : (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);

      const longRuns = item.longBylineText?.runs ?? [];
      const nonSeparators = longRuns.filter((r: any) => r.text !== ' • ' && r.text?.trim() !== '•');
      const albumRun = nonSeparators.find((r: any, idx: number) => {
        if (idx === 0) return false;
        const txt = r.text?.trim() || '';
        if (/^\d{4}$/.test(txt)) return false;
        if (/views$/i.test(txt)) return false;
        if (/^\d+:\d+$/.test(txt)) return false;
        return true;
      });
      const albumName = albumRun?.text ?? 'Single';
      const albumId = albumRun?.navigationEndpoint?.browseEndpoint?.browseId;
      const artistId = item.shortBylineText?.runs?.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;

      tracks.push({
        id,
        url: `https://dummy.com/track-${id}.mp3`,
        title,
        artist,
        album: albumName,
        duration,
        artwork,
        artistId,
        albumId,
      });

      if (tracks.length >= limit) break;
    }

    console.log(`[PlaybackService] Radio queue fetched ${tracks.length} tracks for ${videoId}`);
    return tracks;
  } catch (err: any) {
    console.warn('[PlaybackService] getRadioQueue failed:', err.message);
    return [];
  }
}

export async function PlaybackService() {
  // ─── Remote Controls (lock screen / headphones / CarPlay) ─────────
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

  // ─── Audio ducking (e.g. notification sounds) ─────────────────────
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

  // ─── Playback lifecycle ───────────────────────────────────────────
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, () => {
    // Optionally loop the queue
    // TrackPlayer.skip(0);
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
    }
    lastTrackId = currentId;

    const idx = await TrackPlayer.getActiveTrackIndex();
    if (typeof idx === 'number') {
      savePlayerActiveTrack(idx);
    }

    if (currentId) {
      // Defer all heavy audio resolution, autoplay radio fetching, history trimming,
      // and pre-resolving to prevent blocking the JS thread during transition. This
      // allows the UI list row highlight and smooth scroll animation to run lag-free.
      setTimeout(async () => {
        try {
          const queue = await TrackPlayer.getQueue();
          const activeIndex = await TrackPlayer.getActiveTrackIndex();
          if (activeIndex === undefined || activeIndex === null) return;

          // Double check that active track hasn't changed during the defer delay
          const currentTrack = queue[activeIndex];
          if (!currentTrack || String(currentTrack.id) !== String(currentId)) {
            console.log('[PlaybackService] Track changed during defer. Skipping resolution.');
            return;
          }

          // ── 0. Resolve the CURRENT active track if it is a placeholder URL ─
          const currentActiveTrack = currentTrack;
          if (currentActiveTrack && currentActiveTrack.url && currentActiveTrack.url.toString().includes('dummy.com')) {
            console.log(`[PlaybackService] Active track is a placeholder: ${currentActiveTrack.title}. Resolving immediately...`);
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
                    // Only auto-play if this track change was not triggered by a
                    // video quality switch (which handles its own playback via expo-video).
                    if (!suppressNextAutoPlay) {
                      await TrackPlayer.play();
                    } else {
                      suppressNextAutoPlay = false;
                      console.log('[PlaybackService] Suppressed auto-play (video quality change).');
                    }
                    console.log(`[PlaybackService] Active track resolution complete: ${currentActiveTrack.title}`);
                  }
                }
              })
              .catch((err) => {
                console.warn(`[PlaybackService] Active track resolution failed for ${currentActiveTrack.title}:`, err.message);
              });
          }

          // ── 1. Dynamic Autoplay Queue ────────────────────────────────
          // Trigger when within 2 tracks of the end so we have plenty
          // of time to fetch before the user reaches the last song.
          const isYtTrack = currentId.length === 11 || currentActiveTrack?.album === 'YouTube Music' || currentActiveTrack?.album === 'Single' || currentActiveTrack?.url?.toString().includes('googlevideo.com') || currentActiveTrack?.url?.toString().includes('dummy.com');
          const tracksLeft = queue.length - 1 - activeIndex;

          if (
            isYtTrack &&
            tracksLeft <= 2 &&
            !isFetchingRadio &&
            !radioFetchedForId.has(currentId)
          ) {
            isFetchingRadio = true;
            radioFetchedForId.add(currentId);
            console.log(`[PlaybackService] Near end of queue (${tracksLeft} left). Fetching radio queue for: ${currentActiveTrack?.title}`);

            // Use the last non-dummy queued track as seed for best results
            const latestQueue = await TrackPlayer.getQueue();
            const lastRealTrack = [...latestQueue]
              .reverse()
              .find((t) => t.id && String(t.id).length === 11 && !String(t.url).includes('dummy.com'));
            const seedId = lastRealTrack?.id ? String(lastRealTrack.id) : currentId;

            getRadioQueue(seedId, 10)
              .then(async (tracksToAdd) => {
                if (tracksToAdd.length > 0) {
                  // Filter out IDs already in the queue
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

          // Load preferences from AsyncStorage directly
          let preResolveLimit = 2; // default
          let lyricsPrefetch = true; // default
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

          // ── 1b. Auto-trim history to prevent unbounded queue growth ──
          // Run after radio fetch logic so index calculations above remain
          // valid (trimHistory changes queue indices).
          trimHistory().catch(() => {});

          // ── 2. Pre-resolve next placeholder tracks ────────────
          // Pre-resolve next tracks so the user never hits a
          // dummy URL stall when skipping quickly through the queue.
          const updatedQueue = await TrackPlayer.getQueue();

          const preResolveAt = async (targetIndex: number) => {
            if (targetIndex >= updatedQueue.length) return;
            const targetTrack = updatedQueue[targetIndex];
            if (!targetTrack || !targetTrack.url || !targetTrack.url.toString().includes('dummy.com')) return;

            console.log(`[PlaybackService] Pre-resolving track at index ${targetIndex}: ${targetTrack.title}...`);
            
            // Pre-fetch lyrics in the background if enabled
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

          // Pre-resolve up to `preResolveLimit` tracks with staggered delays
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

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (event) => {
    savePlayerPosition(event.position);
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

          const isYtTrack = activeTrack.id.length === 11 || activeTrack.album === 'YouTube Music' || activeTrack.album === 'Single' || activeTrack.url?.toString().includes('googlevideo.com') || activeTrack.url?.toString().includes('dummy.com');
          if (isYtTrack) {
            console.log(`[PlaybackService] Bad HTTP status or Source error on track ${activeTrack.title}. Refreshing stream URL (attempt ${attempts + 1}/2)...`);
            const forcePiped = attempts > 0;
            const resolved = await resolveAudio(activeTrack.id, forcePiped);
            const activeIndex = await TrackPlayer.getActiveTrackIndex();
            if (activeIndex !== undefined && activeIndex !== null && activeIndex >= 0) {
              const queue = await TrackPlayer.getQueue();
              const originalTrack = queue[activeIndex];

              // Get current progress position before replacing
              const progress = await TrackPlayer.getProgress();
              const position = progress.position;

              const updatedTrack = {
                ...originalTrack,
                url: resolved.track.url,
                videoUrl: resolved.videoUrl ?? undefined,
                headers: resolved.track.headers,
                userAgent: resolved.track.userAgent,
                artistId: resolved.track.artistId ?? originalTrack.artistId,
                albumId: (resolved.track as any).albumId ?? originalTrack.albumId,
                artists: (resolved.track as any).artists ?? originalTrack.artists,
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
              await TrackPlayer.play();
            }
          }
        }
      } catch (err: any) {
        console.warn('[PlaybackService] Failed to recover track playback:', err.message);
      }
    }
  });
}
