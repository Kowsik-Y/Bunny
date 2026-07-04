import { type AppTrack } from '@/components/player/Tracks';

export async function getRadioQueue(videoId: string, limit = 10): Promise<AppTrack[]> {
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
      if (!id || id === videoId) continue;

      const title: string = item.title?.runs?.[0]?.text ?? 'Unknown';
      const artist: string =
        item.shortBylineText?.runs?.[0]?.text ??
        item.longBylineText?.runs?.[0]?.text ??
        'Unknown Artist';

      const thumbs: any[] = item.thumbnail?.thumbnails ?? [];
      const artwork: string =
        thumbs[thumbs.length - 1]?.url ?? 'https://picsum.photos/400/400';

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
