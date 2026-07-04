/**
 * useYouTubeAudio.ts
 * After applying the BaseAudioPlayer.kt patch, pass User-Agent via headers.
 * The patch makes ExoPlayer read User-Agent from track headers per-track.
 */

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pipedService } from './piped';
import YoutubeExtractor from '../modules/youtube-extractor';


const PLAYER_URL =
  'https://www.youtube.com/youtubei/v1/player?prettyPrint=false';

const IOS_UA =
  'com.google.ios.youtube/20.10.4 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X)';

const ANDROID_UA =
  'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip';

const CLIENTS = [
  {
    name: 'ANDROID_VR',
    context: {
      client: {
        clientName: 'ANDROID_VR', clientVersion: '1.43.32',
        osName: 'Android', osVersion: '12',
        deviceMake: 'Oculus', deviceModel: 'Quest 3',
        androidSdkVersion: 32,
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/107.0.5284.2)',
      'X-YouTube-Client-Name': '28',
      'X-YouTube-Client-Version': '1.43.32',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.android.apps.youtube.vr.oculus/1.43.32 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/107.0.5284.2)',
    useSignatureTimestamp: false,
  },
  {
    name: 'ANDROID_VR_1_61_48',
    context: {
      client: {
        clientName: 'ANDROID_VR', clientVersion: '1.61.48',
        osName: 'Android', osVersion: '12',
        deviceMake: 'Oculus', deviceModel: 'Quest 3',
        androidSdkVersion: 32,
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/132.0.6808.3)',
      'X-YouTube-Client-Name': '28',
      'X-YouTube-Client-Version': '1.61.48',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; en_US; Quest 3; Build/SQ3A.220605.009.A1; Cronet/132.0.6808.3)',
    useSignatureTimestamp: false,
  },
  // TV_EMBEDDED: targets the YouTube TV embedded player (client ID 85).
  // This client is exempt from bot-detection and does NOT require login cookies.
  // It is the most reliable bypass available without OAuth.
  {
    name: 'TV_EMBEDDED',
    context: { client: {
      clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0',
      hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
    }},
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.5 TV Safari/538.1',
      'X-YouTube-Client-Name': '85',
      'X-YouTube-Client-Version': '2.0',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.5) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.5 TV Safari/538.1',
    useSignatureTimestamp: true,
  },
  // MEDIA_CONNECT_FRONTEND: Cast receiver client (ID 95), also exempt from bot checks.
  {
    name: 'MEDIA_CONNECT_FRONTEND',
    context: { client: {
      clientName: 'MEDIA_CONNECT_FRONTEND', clientVersion: '0.1',
      hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
    }},
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36',
      'X-YouTube-Client-Name': '95',
      'X-YouTube-Client-Version': '0.1',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'Mozilla/5.0 (Linux; Android 10; SM-G975U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36',
    useSignatureTimestamp: true,
  },
  {
    name: 'ANDROID_NO_PARAMS',
    context: {
      client: {
        clientName: 'ANDROID', clientVersion: '21.03.38',
        androidSdkVersion: 34,
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip',
      'X-YouTube-Client-Name': '3',
      'X-YouTube-Client-Version': '21.03.38',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip',
    useSignatureTimestamp: false,
  },
  {
    name: 'WEB',
    context: {
      client: {
        clientName: 'WEB', clientVersion: '2.20260213.00.00',
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
      'X-YouTube-Client-Name': '1',
      'X-YouTube-Client-Version': '2.20260213.00.00',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
    useSignatureTimestamp: false,
  },
  {
    name: 'IOS',
    context: {
      client: {
        clientName: 'IOS', clientVersion: '21.03.1',
        deviceModel: 'iPhone16,2',
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)',
      'X-YouTube-Client-Name': '5',
      'X-YouTube-Client-Version': '21.03.1',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.ios.youtube/21.03.1 (iPhone16,2; U; CPU iOS 18_2 like Mac OS X;)',
    useSignatureTimestamp: false,
  },
  {
    name: 'ANDROID_AGE_RESTRICTED',
    context: {
      client: {
        clientName: 'ANDROID', clientVersion: '21.03.38',
        androidSdkVersion: 34,
        hl: 'en', gl: 'US', timeZone: 'UTC', utcOffsetMinutes: 0,
      }
    },
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip',
      'X-YouTube-Client-Name': '3',
      'X-YouTube-Client-Version': '21.03.38',
      'X-Goog-Api-Format-Version': '1',
      'Origin': 'https://music.youtube.com',
      'Referer': 'https://music.youtube.com/',
    },
    extra: { params: 'CgIQBg', contentCheckOk: true, racyCheckOk: true },
    streamUA: 'com.google.android.youtube/21.03.38 (Linux; U; Android 14) gzip',
    useSignatureTimestamp: false, // In Echo-Music ANDROID_NO_SDK uses false
  },
];

let cachedSts: number | null = null;
let lastStsFetch = 0;
let cachedVisitorData: string | null = null;

// Hardcoded working fallback in case all endpoints/extractions fail
const FALLBACK_VISITOR_DATA = 'CgtVXzcwWng2R29DdyiL257SBjIKCgJJThIEGgAgGmLfAgrcAjE5LllUPVpvd2l1RXJxNXRIV1N4bE80bG5aaXNaTzZPSFJad0p2amRkREFRT3JhS21DeS1MUzM5NktRVmV6MXlPam8yRlRyYkY5Z3NfajZXMjlMS0tjOGdkMmFLb1R0amhiUngyT2E2N2drS2hvd2JScUtmV0xNRERya3ZSdGFNSW9Gb1BMYldQQTRIMWRvWjFrU21vNGJHdm95WlhUZWVNNXZyVkV1bTIzSWV6TUdkZVNuNXpCdEJSLXYzd3NaOWFsLTg3WlUwWWN2YlREcTVpRWtrRnA0VXVqTDZuTDdXM19ZVG03M0ZqVllxcW13aVc0S3JBTUZXb0hJXzFOc3U3SGlzYjlyR3I2QXJ6bko4Z2JxdHlTM3N3cDl3UzdZaEdCU2FmcEUzRWVFRXBCSktTdThIdkExMkxqR1lSVDhTdXVVcDJERWlGdmdSMjI5a2NMekZDNDhvWkNaQQ==';

function findVisitorData(obj: any): string | null {
  if (typeof obj === 'string') {
    if (/^Cg[t|s]/.test(obj)) {
      return decodeURIComponent(obj);
    }
    try {
      const decoded = decodeURIComponent(obj);
      if (/^Cg[t|s]/.test(decoded)) {
        return decoded;
      }
    } catch {}
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findVisitorData(item);
      if (found) return found;
    }
  } else if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const found = findVisitorData(obj[key]);
      if (found) return found;
    }
  }
  return null;
}

async function fetchVisitorFromHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"visitorData"\s*:\s*"([^"]+)"/);
    if (match && match[1]) {
      const decoded = decodeURIComponent(match[1]);
      if (/^Cg[t|s]/.test(decoded)) {
        return decoded;
      }
    }
  } catch (e) {
    if (__DEV__) console.warn(`[YouTubeAudio] Failed to fetch visitorData from HTML (${url}):`, e);
  }
  return null;
}

async function getVisitorData(): Promise<string | null> {
  if (cachedVisitorData) return cachedVisitorData;

  // Try Source 1: sw.js_data (JSON parsing with robust recursive search)
  try {
    const res = await fetch('https://music.youtube.com/sw.js_data', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) {
      const text = await res.text();
      const jsonStart = text.indexOf('[');
      const cleanText = jsonStart !== -1 ? text.substring(jsonStart) : text;
      const json = JSON.parse(cleanText);
      const visitor = findVisitorData(json);
      if (visitor) {
        cachedVisitorData = visitor;
        return cachedVisitorData;
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[YouTubeAudio] sw.js_data fetch/parse failed:', e);
  }

  // Try Source 2: YouTube Music homepage HTML
  const musicHtmlVisitor = await fetchVisitorFromHtml('https://music.youtube.com/');
  if (musicHtmlVisitor) {
    cachedVisitorData = musicHtmlVisitor;
    return cachedVisitorData;
  }

  // Try Source 3: YouTube homepage HTML
  const ytHtmlVisitor = await fetchVisitorFromHtml('https://www.youtube.com/');
  if (ytHtmlVisitor) {
    cachedVisitorData = ytHtmlVisitor;
    return cachedVisitorData;
  }

  // Fallback if everything else fails
  cachedVisitorData = FALLBACK_VISITOR_DATA;
  return cachedVisitorData;
}

async function getSignatureTimestamp(videoId?: string): Promise<number> {
  const now = Date.now();
  if (cachedSts && now - lastStsFetch < 24 * 60 * 60 * 1000) {
    return cachedSts;
  }

  try {
    const id = videoId || 'dQw4w9WgXcQ';
    const embedRes = await fetch(`https://www.youtube.com/embed/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    if (!embedRes.ok) throw new Error(`HTML ${embedRes.status}`);
    const embedHtml = await embedRes.text();

    const jsPathRegex = /\/s\/player\/[a-zA-Z0-9_.-/]+\/base\.js/;
    const match = embedHtml.match(jsPathRegex);
    if (!match) {
      throw new Error('base.js path not found');
    }

    const jsUrl = 'https://www.youtube.com' + match[0];
    const jsRes = await fetch(jsUrl);
    if (!jsRes.ok) throw new Error(`JS ${jsRes.status}`);
    const jsCode = await jsRes.text();

    const stsRegex = /signatureTimestamp\s*:\s*(\d+)/;
    const stsMatch = jsCode.match(stsRegex);
    if (stsMatch) {
      cachedSts = parseInt(stsMatch[1], 10);
      lastStsFetch = now;
      return cachedSts;
    }

    const stsRegex2 = /sts\s*:\s*(\d+)/;
    const stsMatch2 = jsCode.match(stsRegex2);
    if (stsMatch2) {
      cachedSts = parseInt(stsMatch2[1], 10);
      lastStsFetch = now;
      return cachedSts;
    }

    throw new Error('sts match not found');
  } catch (e) {
    if (__DEV__) console.warn('[YouTubeAudio] sts extraction failed, using fallback:', e);
    return 20622; // Working fallback sts
  }
}

export async function resolveAudio(videoId: string, forcePiped = false) {
  let quality: 'low' | 'medium' | 'high' = 'medium';
  try {
    const raw = await AsyncStorage.getItem('app-theme-preferences');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.audioQuality === 'low' || parsed.audioQuality === 'medium' || parsed.audioQuality === 'high') {
        quality = parsed.audioQuality;
      }
    }
  } catch (e) {
    if (__DEV__) console.warn('[YouTubeAudio] Failed to read audio quality from AsyncStorage:', e);
  }

  const errors: string[] = [];
  const sts = await getSignatureTimestamp(videoId);
  const visitorData = await getVisitorData();

  if (!forcePiped) {
    for (const cfg of CLIENTS) {
      try {
        const clientContext: any = {
          ...cfg.context.client,
        };
        if (visitorData) {
          clientContext.visitorData = visitorData;
        }

        const body: any = {
          videoId,
          context: {
            client: clientContext,
          },
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
            cachedVisitorData = null; // Rotate session for next resolve
          }
          throw new Error(reason);
        }

        const vd = data?.videoDetails ?? {};
        const title = vd.title ?? videoId;
        const artist = vd.author ?? '';

        // Skipping OMV (official music video) search to optimize resolution speed
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
          // Prefer WEBM (OPUS) over M4A/MP4 for better stability/compatibility like in Echo-Music
          const aIsWebm = a.format === 'WEBM';
          const bIsWebm = b.format === 'WEBM';
          if (aIsWebm && !bIsWebm) return -1;
          if (!aIsWebm && bIsWebm) return 1;
          return quality === 'low' ? a.bitrate - b.bitrate : b.bitrate - a.bitrate;
        });

        // Extract video streams — prefer muxed (video + audio) formats first, then
        // also include H.264 adaptive video-only formats from the OMV so users can pick
        // higher quality (720p, 1080p etc). In video mode, TrackPlayer is paused and
        // expo-video handles playback from its own stream — so video-only adaptive
        // formats are usable as the audio comes from the OMV muxed format initially,
        // or the user stays on muxed for full quality.
        const targetDataForVideo = videoData || data;
        const muxedVideoFormats = (targetDataForVideo?.streamingData?.formats ?? [])
          .filter((f: any) => f?.mimeType?.startsWith('video/') && f.mimeType.includes('mp4a'));

        // If we resolved an OMV, also include H.264 MP4 adaptive video formats
        // (avc1 codec only — broadly compatible with expo-video on iOS/Android).
        // We deduplicate by quality label, keeping the highest bitrate variant.
        const adaptiveVideoFormats: any[] = videoData
          ? (videoData?.streamingData?.adaptiveFormats ?? [])
              .filter((f: any) =>
                f?.mimeType?.startsWith('video/mp4') &&
                f.mimeType.includes('avc1') &&
                f.url && // Must have a direct URL (no cipher on ANDROID client)
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

        // Deduplicate by quality label, keeping highest bitrate. Sort muxed first, then by bitrate desc.
        const seenQuality = new Set<string>();
        const deduped: any[] = [];
        // Muxed first (they have combined audio+video)
        for (const v of videoList.filter((v: any) => muxedVideoFormats.some((m: any) => m.itag === v.itag))) {
          const key = v.quality;
          if (!seenQuality.has(key)) { seenQuality.add(key); deduped.push(v); }
        }
        // Then adaptive
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
            // After the patch, ExoPlayer reads User-Agent from headers per-track
            // Without patch: use userAgent field (RNTP built-in, less reliable)
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

  // Fallback to Piped service if all direct clients fail
  try {
    if (__DEV__) console.log('[Piped Fallback] Resolving stream via Piped API...');
    const data = await pipedService.getStream(videoId);
    const title = data.title ?? videoId;
    const artist = data.uploader ?? 'Unknown Artist';
    const duration = data.duration ?? 0;
    const thumbnail = data.thumbnailUrl ?? null;

    // Skipping OMV (official music video) search in Piped fallback to optimize resolution speed
    let videoVideoId: string | null = null;
    let videoData: any = null;

    const audioStreams = data?.audioStreams ?? [];
    const targetVideoData = videoData || data;
    // For video streams, filter to include compatible H.264 formats (mp4 / avc1)
    const rawVideoStreams = targetVideoData?.videoStreams ?? [];
    
    const parsedAudio = audioStreams
      .filter((f: any) => f?.url)
      .map((f: any) => ({
        url: f.url as string,
        mimeType: f.mimeType as string,
        format: f.mimeType?.includes('audio/webm') ? 'WEBM' : 'MP4',
        quality: 'High',
        bitrate: f.bitrate ?? 0,
        itag: f.itag ?? -1,
      }))
      .sort((a: any, b: any) => {
        const aIsWebm = a.format === 'WEBM';
        const bIsWebm = b.format === 'WEBM';
        if (aIsWebm && !bIsWebm) return -1;
        if (!aIsWebm && bIsWebm) return 1;
        return quality === 'low' ? a.bitrate - b.bitrate : b.bitrate - a.bitrate;
      });

    const parsedVideo = rawVideoStreams
      .filter((f: any) => f?.url && f.mimeType?.includes('video/mp4') && f.mimeType?.includes('avc1'))
      .map((f: any) => ({
        url: f.url as string,
        mimeType: f.mimeType as string,
        format: 'MP4',
        quality: f.qualityLabel ?? (f.height ? `${f.height}p` : '360p'),
        bitrate: f.bitrate ?? 0,
        itag: f.itag ?? -1,
      }));

    // Deduplicate video formats by quality
    const seenQuality = new Set<string>();
    const dedupedVideo: any[] = [];
    for (const v of parsedVideo) {
      const q = v.quality || '360p';
      if (!seenQuality.has(q)) {
        seenQuality.add(q);
        dedupedVideo.push(v);
      }
    }
    dedupedVideo.sort((a: any, b: any) => b.bitrate - a.bitrate);

    if (!parsedAudio.length) throw new Error('No Piped stream formats found');

    if (__DEV__)
      console.log(`[Piped Fallback] ✓ ${parsedAudio[0].format} ${(parsedAudio[0].bitrate / 1000).toFixed(0)} kbps`);

    return {
      videoId,
      title,
      artist,
      duration,
      thumbnail,
      best: parsedAudio[0],
      allAudio: parsedAudio,
      videoUrl: dedupedVideo[0]?.url ? dedupedVideo[0].url + `&__ua=${encodeURIComponent('ViTune')}` : null,
      client: 'PIPED_FALLBACK',
      streamUA: 'ViTune',
      track: {
        id: videoId,
        url: parsedAudio[0].url + `&__ua=${encodeURIComponent('ViTune')}`,
        title,
        artist,
        artwork: thumbnail ?? undefined,
        duration,
        allAudio: parsedAudio,
        activeItag: parsedAudio[0].itag,
        allVideo: dedupedVideo.map((v: any) => ({ ...v, url: v.url + `&__ua=${encodeURIComponent('ViTune')}` })),
        activeVideoItag: dedupedVideo[0]?.itag || undefined,
        headers: { 'User-Agent': 'ViTune' },
        userAgent: 'ViTune',
      },
    };
  } catch (pipedErr: any) {
    if (__DEV__) console.warn('[Piped Fallback] ✗', pipedErr.message);
    errors.push(`Piped: ${pipedErr.message}`);
  }

  throw new Error('All clients and fallback failed:\n' + errors.join('\n'));
}

export function useYouTubeAudio() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolve = useCallback(async (videoId: string) => {
    setLoading(true); setError(null);
    try { return await resolveAudio(videoId); }
    catch (e: any) { setError(e.message); throw e; }
    finally { setLoading(false); }
  }, []);
  return { resolve, loading, error };
}

export default useYouTubeAudio;