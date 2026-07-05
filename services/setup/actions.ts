import TrackPlayer, { State } from 'react-native-track-player';
import { type AppTrack } from '@/components/player/Tracks';
import { resolveAudio } from '../useYouTubeAudio';
import { getLocalDownloadUri } from '../downloads';

export const PlayerActions = {
  playPause: async (isPlaying: boolean) => {
    try {
      const state = await TrackPlayer.getPlaybackState();
      if (state.state === State.Playing) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    } catch {
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
    const targetIdx = queue.findIndex((t) => String(t.id) === String(trackId));
    if (targetIdx < 0) return;

    const activeIdx = await TrackPlayer.getActiveTrackIndex();
    if (activeIdx === undefined || activeIdx === null) return;

    if (targetIdx === activeIdx) {
      await TrackPlayer.play();
      return;
    }

    await TrackPlayer.skip(targetIdx);
    await TrackPlayer.play();
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
          album:    ytTrack.album || 'Single',
          duration: ytTrack.duration || 0,
          artwork:  ytTrack.thumbnail || ytTrack.artwork || 'https://picsum.photos/400/400',
          artistId: ytTrack.artistId || ytTrack.authorId || undefined,
          albumId:  ytTrack.albumId || undefined,
          artists:  ytTrack.artists || undefined,
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
        album:    ytTrack.album   || 'Single',
        duration: result.duration || ytTrack.duration || 0,
        artwork:  result.thumbnail || ytTrack.thumbnail || 'https://picsum.photos/400/400',
        headers:  result.track.headers,
        userAgent: result.track.userAgent,
        videoUrl: result.videoUrl ?? undefined,
        artistId: result.track.artistId || ytTrack.artistId || ytTrack.authorId || undefined,
        albumId:  (result.track as any).albumId || ytTrack.albumId || undefined,
        artists:  (result.track as any).artists || ytTrack.artists || undefined,
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
