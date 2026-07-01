import TrackPlayer, { Event, State } from 'react-native-track-player';
import { resolveAudio } from './useYouTubeAudio';
import { type AppTrack } from '@/components/player/Tracks';
import { toast } from './toast';

// Keep track of retry attempts per track ID to prevent infinite loops
const retryCounts = new Map<string, number>();
let lastTrackId: string | undefined = undefined;

// Prevent concurrent or duplicate radio queue fetches
let isFetchingRadio = false;
const radioFetchedForId = new Set<string>();

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

      tracks.push({
        id,
        url: `https://dummy.com/track-${id}.mp3`,
        title,
        artist,
        album: 'YouTube Music',
        duration,
        artwork,
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

    if (currentId) {
      try {
        const queue = await TrackPlayer.getQueue();
        const activeIndex = await TrackPlayer.getActiveTrackIndex();

        // ── 0. Resolve the CURRENT active track if it is a placeholder URL ─
        const currentActiveTrack = event.track;
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
        // Trigger when within 2 tracks of the end so we have time to
        // fetch before the user reaches the last song.
        const isYtTrack = currentId.length === 11 || event.track?.album === 'YouTube Music';
        const tracksLeft = queue.length - 1 - (activeIndex ?? 0);

        if (
          isYtTrack &&
          activeIndex !== undefined &&
          tracksLeft <= 1 &&
          !isFetchingRadio &&
          !radioFetchedForId.has(currentId)
        ) {
          isFetchingRadio = true;
          radioFetchedForId.add(currentId);
          console.log(`[PlaybackService] Near end of queue (${tracksLeft} left). Fetching radio queue for: ${event.track?.title}`);

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
                console.warn('[PlaybackService] Autoplay: Radio queue returned 0 tracks.');
              }
            })
            .catch((err) => {
              console.warn('[PlaybackService] Autoplay radio fetch failed:', err.message);
            })
            .finally(() => {
              isFetchingRadio = false;
            });
        }

        // ── 2. Pre-resolve the next track if it is a placeholder URL ─
        if (activeIndex !== undefined) {
          const updatedQueue = await TrackPlayer.getQueue();
          const nextIndex = activeIndex + 1;
          if (nextIndex < updatedQueue.length) {
            const nextTrack = updatedQueue[nextIndex];
            if (nextTrack && nextTrack.url && nextTrack.url.toString().includes('dummy.com')) {
              console.log(`[PlaybackService] Pre-resolving next track in queue: ${nextTrack.title}...`);
              resolveAudio(String(nextTrack.id))
                .then(async (resolved) => {
                  const currentActive = await TrackPlayer.getActiveTrackIndex();
                  if (currentActive !== undefined && currentActive < nextIndex) {
                    const latestQueue = await TrackPlayer.getQueue();
                    const targetOriginal = latestQueue[nextIndex];
                    if (targetOriginal && String(targetOriginal.id) === String(nextTrack.id)) {
                      const updatedTrack = {
                        ...targetOriginal,
                        url: resolved.track.url,
                        videoUrl: resolved.videoUrl ?? undefined,
                        headers: resolved.track.headers,
                        userAgent: resolved.track.userAgent,
                        artistId: resolved.track.artistId ?? targetOriginal.artistId,
                        allAudio: resolved.track.allAudio,
                        activeItag: resolved.track.activeItag,
                        allVideo: resolved.track.allVideo,
                        activeVideoItag: resolved.track.activeVideoItag,
                      };
                      await TrackPlayer.add([updatedTrack], nextIndex);
                      await TrackPlayer.remove(nextIndex + 1);
                      console.log(`[PlaybackService] Pre-resolution complete for next track: ${nextTrack.title}`);
                    }
                  }
                })
                .catch((err) => {
                  console.warn(`[PlaybackService] Pre-resolution failed for ${nextTrack.title}:`, err.message);
                });
            }
          }
        }
      } catch (err: any) {
        console.warn('[PlaybackService] Autoplay/Pre-resolve failed:', err.message);
      }
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, (_event) => {
    // event.position, event.duration, event.buffered
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

          const isYtTrack = activeTrack.id.length === 11 || activeTrack.album === 'YouTube Music' || activeTrack.url?.toString().includes('googlevideo.com');
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
