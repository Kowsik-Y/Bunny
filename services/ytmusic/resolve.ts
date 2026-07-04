import { resolveAudio } from '../useYouTubeAudio';
import { YtMusicResolve } from './types';

export async function resolveYtMusic(url: string): Promise<YtMusicResolve> {
  try {
    const videoId = url.split('v=')[1] || url.split('/').pop() || '';
    const res = await resolveAudio(videoId);
    return {
      id: res.videoId,
      title: res.title,
      artist: res.artist,
      duration: res.duration,
      thumbnail: res.thumbnail,
      streamUrl: res.best.url,
      ext: res.best.format?.toLowerCase() || 'm4a',
      webpageUrl: `https://music.youtube.com/watch?v=${res.videoId}`,
      headers: res.track.headers,
      userAgent: res.track.userAgent,
    };
  } catch (e) {
    console.error('Failed to resolve YTMusic client-side:', e);
    throw e;
  }
}
