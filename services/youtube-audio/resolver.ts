import { Platform } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import YoutubeExtractor from '../../modules/youtube-extractor';
import { CLIENTS } from './clients';
import { getVisitorData, invalidateVisitorData } from './visitorData';
import { getSignatureTimestamp } from './signature';
import { resolveJioSaavn } from './jiosaavn';

import { getDownloadedTracks, getLocalDownloadUri } from '../downloads/storage';

const PLAYER_URL =
  'https://music.youtube.com/youtubei/v1/player?prettyPrint=false';

export async function resolveAudio(videoId: string, forcePiped = false) {
  // First, check if the song is downloaded locally!
  try {
    const downloads = await getDownloadedTracks();
    const found = downloads.find((d) => String(d.track.id) === String(videoId));
    if (found) {
      const exists = await getLocalDownloadUri(videoId);
      if (exists) {
        if (__DEV__) console.log(`[resolveAudio] Found local downloaded file for: ${found.track.title}`);
        const bestFormat = {
          url: exists,
          mimeType: 'audio/m4a',
          format: 'MP4',
          quality: 'high',
          bitrate: 128000,
          itag: 0,
        };
        return {
          videoId,
          title: found.track.title,
          artist: found.track.artist,
          duration: found.track.duration,
          thumbnail: found.track.artwork || null,
          best: bestFormat,
          allAudio: [bestFormat],
          client: 'LOCAL',
          streamUA: '',
          track: {
            id: videoId,
            url: exists,
            title: found.track.title,
            artist: found.track.artist,
            artwork: found.track.artwork,
            duration: found.track.duration,
            artistId: found.track.artistId,
            albumId: (found.track as any).albumId,
            artists: (found.track as any).artists,
            allAudio: [bestFormat],
            activeItag: 0,
            allVideo: [],
            activeVideoItag: undefined,
            headers: {},
            userAgent: '',
          }
        };
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('[resolveAudio] Failed to check local download cache:', err);
  }

  let quality: 'low' | 'medium' | 'high' = 'medium';
  try {
    const rawPrefs = await TrackPlayer.getQueue(); // Just check if TrackPlayer works
  } catch (e) {}

  const errors: string[] = [];
  const sts = await getSignatureTimestamp(videoId);
  const visitorData = await getVisitorData();

  if (!forcePiped) {
    for (const cfg of CLIENTS) {
      try {
        if (__DEV__) console.log(`[resolveAudio] Trying direct client ${cfg.name}...`);
        
        const clientContext = {
          ...cfg.context.client,
        } as any;
        if (visitorData) {
          clientContext.visitorData = visitorData;
        }

        const bodyContext: any = {
          client: clientContext,
        };
        if (cfg.name === 'TV_EMBEDDED') {
          bodyContext.thirdParty = {
            embedUrl: `https://www.youtube.com/watch?v=${videoId}`
          };
        }

        const body: any = {
          videoId,
          context: bodyContext,
          ...cfg.extra,
        };

        if (sts) {
          body.playbackContext = {
            contentPlaybackContext: {
              signatureTimestamp: sts,
            },
          };
        }

        const headers: any = {
          ...cfg.headers,
        };
        if (cfg.name !== 'WEB') {
          headers['Origin'] = 'https://music.youtube.com';
          headers['X-Origin'] = 'https://music.youtube.com';
          headers['Referer'] = 'https://music.youtube.com/';
        }
        if (visitorData) {
          headers['X-Goog-Visitor-Id'] = visitorData;
        }

        const res = await fetch(PLAYER_URL, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const ps = data?.playabilityStatus;
        if (ps?.status && ps.status !== 'OK') {
          const reason = ps.reason ?? ps.status;
          if (reason.toLowerCase().includes('bot') || reason.toLowerCase().includes('sign in to confirm')) {
            invalidateVisitorData(); // Rotate session for next resolve
          }
          throw new Error(reason);
        }

        const vd = data?.videoDetails ?? {};
        const title = vd.title ?? videoId;
        const artist = vd.author ?? '';

        let videoVideoId: string | null = null;
        let videoData: any = null;

        const allAudioFormats = (data?.streamingData?.adaptiveFormats ?? [])
          .filter((f: any) => f?.mimeType?.startsWith('audio/'));
        if (__DEV__) {
          console.log(`[${cfg.name}] OK formats: ${allAudioFormats.length}`);
          allAudioFormats.forEach((f: any) => {
            const hasUrl = !!f.url;
            const fmtName = f.mimeType?.includes('audio/mp4') ? 'MP4' : f.mimeType?.includes('audio/webm') ? 'WEBM' : 'UNKNOWN';
            console.log(`  -> ${fmtName} (bitrate: ${(f.bitrate / 1000).toFixed(0)} kbps, itag: ${f.itag}, hasUrl: ${hasUrl}, mime: ${f.mimeType})`);
          });
        }

        const audio: any[] = [];
        for (const f of allAudioFormats) {
          let finalUrl = f.url as string | null;
          if (Platform.OS === 'android') {
            if (!finalUrl && f.signatureCipher) {
              try {
                finalUrl = await YoutubeExtractor.deobfuscateUrl(videoId, null, f.signatureCipher);
                if (finalUrl && finalUrl.startsWith("ERROR")) {
                  if (__DEV__) console.warn(`[YoutubeExtractor] Native decipher error for itag ${f.itag}:`, finalUrl);
                  finalUrl = null;
                }
              } catch (e: any) {
                if (__DEV__) console.warn(`[YoutubeExtractor] Native call failed for itag ${f.itag}:`, e.message);
              }
            } else if (finalUrl) {
              try {
                const unthrottled = await YoutubeExtractor.deobfuscateUrl(videoId, finalUrl, null);
                if (unthrottled && !unthrottled.startsWith("ERROR")) {
                  finalUrl = unthrottled;
                }
              } catch (e: any) {
                if (__DEV__) console.warn(`[YoutubeExtractor] Throttling bypass failed for itag ${f.itag}:`, e.message);
              }
            }
          }

          if (finalUrl) {
            audio.push({
              url: finalUrl,
              mimeType: f.mimeType as string,
              format: (f.mimeType as string).includes('audio/mp4') ? 'MP4' : (f.mimeType as string).includes('audio/webm') ? 'WEBM' : 'UNKNOWN',
              quality: ((f.audioQuality ?? '') as string).replace('AUDIO_QUALITY_', '').toLowerCase(),
              bitrate: (f.bitrate ?? 0) as number,
              codec: (f.mimeType as string)?.match(/codecs="([^"]+)"/)?.[1] ?? null,
              itag: f.itag as number,
            });
          }
        }

        audio.sort((a: any, b: any) => {
          const aIsWebm = a.format === 'WEBM';
          const bIsWebm = b.format === 'WEBM';
          if (aIsWebm && !bIsWebm) return -1;
          if (!aIsWebm && bIsWebm) return 1;
          return (quality as string) === 'low' ? a.bitrate - b.bitrate : b.bitrate - a.bitrate;
        });

        const targetDataForVideo = videoData || data;
        const muxedVideoFormats = (targetDataForVideo?.streamingData?.formats ?? [])
          .filter((f: any) => f?.mimeType?.startsWith('video/') && f.mimeType.includes('mp4a'));

        const adaptiveVideoFormats: any[] = videoData
          ? (videoData?.streamingData?.adaptiveFormats ?? [])
              .filter((f: any) =>
                f?.mimeType?.startsWith('video/mp4') &&
                f.mimeType.includes('avc1') &&
                f.url &&
                f.qualityLabel
              )
          : [];

        const videoList: any[] = [];
        for (const f of [...muxedVideoFormats, ...adaptiveVideoFormats]) {
          let finalUrl = f.url as string | null;
          if (Platform.OS === 'android') {
            if (!finalUrl && f.signatureCipher) {
              try {
                finalUrl = await YoutubeExtractor.deobfuscateUrl(videoVideoId || videoId, null, f.signatureCipher);
                if (finalUrl && finalUrl.startsWith("ERROR")) {
                  finalUrl = null;
                }
              } catch (e: any) { }
            } else if (finalUrl) {
              try {
                const unthrottled = await YoutubeExtractor.deobfuscateUrl(videoVideoId || videoId, finalUrl, null);
                if (unthrottled && !unthrottled.startsWith("ERROR")) {
                  finalUrl = unthrottled;
                }
              } catch (e: any) { }
            }
          }
          if (finalUrl) {
            videoList.push({
              url: finalUrl,
              mimeType: f.mimeType as string,
              quality: f.qualityLabel ?? (f.height ? `${f.height}p` : '360p'),
              bitrate: f.bitrate ?? 0,
              itag: f.itag as number,
              isMuxed: !f.url?.includes('adaptiveFormats') && muxedVideoFormats.includes(f),
            });
          }
        }

        const seenQuality = new Set<string>();
        const deduped: any[] = [];
        for (const v of videoList.filter((v: any) => muxedVideoFormats.some((m: any) => m.itag === v.itag))) {
          const key = v.quality;
          if (!seenQuality.has(key)) { seenQuality.add(key); deduped.push(v); }
        }
        for (const v of videoList.filter((v: any) => adaptiveVideoFormats.some((m: any) => m.itag === v.itag))) {
          const key = v.quality;
          if (!seenQuality.has(key)) { seenQuality.add(key); deduped.push(v); }
        }
        deduped.sort((a: any, b: any) => b.bitrate - a.bitrate);

        if (!audio.length) throw new Error('no audio formats');

        const thumbs = vd?.thumbnail?.thumbnails ?? [];
        const thumbnail = thumbs.length ? thumbs[thumbs.length - 1].url : null;
        const duration = parseInt(vd.lengthSeconds ?? '0', 10);

        if (__DEV__)
          console.log(`[${cfg.name}] ✓ ${audio[0].format} ${(audio[0].bitrate / 1000).toFixed(0)} kbps`);

        return {
          videoId,
          title,
          artist,
          duration,
          thumbnail,
          best: audio[0],
          allAudio: audio,
          videoUrl: deduped[0]?.url ? deduped[0].url + `&__ua=${encodeURIComponent(cfg.streamUA)}` : null,
          client: cfg.name,
          streamUA: cfg.streamUA,
          track: {
            id: videoId,
            url: audio[0].url + `&__ua=${encodeURIComponent(cfg.streamUA)}`,
            title,
            artist,
            artwork: thumbnail ?? undefined,
            duration,
            artistId: vd.channelId || vd.authorId || undefined,
            allAudio: audio,
            activeItag: audio[0].itag,
            allVideo: deduped.map((v: any) => ({ ...v, url: v.url + `&__ua=${encodeURIComponent(cfg.streamUA)}` })),
            activeVideoItag: deduped[0]?.itag || undefined,
            headers: { 'User-Agent': cfg.streamUA },
            userAgent: cfg.streamUA,
          },
        };
      } catch (e: any) {
        if (__DEV__) console.warn(`[${cfg.name}] ✗`, e.message);
        errors.push(`${cfg.name}: ${e.message}`);
      }
    }
  }

  try {
    if (__DEV__) console.log('[JioSaavn Fallback] Resolving stream via JioSaavn API...');
    let title: string | undefined;
    let artist: string | undefined;
    let duration: number | undefined;

    try {
      const queue = await TrackPlayer.getQueue();
      const track = queue.find((t: any) => String(t.id) === videoId);
      if (track) {
        title = track.title || undefined;
        artist = track.artist || undefined;
        if (track.duration) {
          duration = track.duration;
        }
      }
    } catch (e) {
      if (__DEV__) console.warn('[resolveAudio] Failed to read queue for metadata fallback:', e);
    }

    if (!title || !artist) {
      throw new Error('Title and artist not found in playback queue');
    }

    const resolved = await resolveJioSaavn(videoId, title, artist, duration || 0);
    return resolved;
  } catch (saavnErr: any) {
    if (__DEV__) console.warn('[JioSaavn Fallback] ✗', saavnErr.message);
    errors.push(`JioSaavn: ${saavnErr.message}`);
  }

  throw new Error('All clients and fallback failed:\n' + errors.join('\n'));
}
