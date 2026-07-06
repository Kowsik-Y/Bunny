import { LrcLine } from './types';
import { cleanText, parseLrc } from './parser';
import { LYRICS_CACHE } from './cache';
import { getInfoAsync, readAsStringAsync } from 'expo-file-system/legacy';
import { getActiveDirectory } from '../downloads/storage';

async function queryLrcLibSearch(title: string, artist: string): Promise<LrcLine[]> {
  const cleanedTitle = cleanText(title);
  const cleanedArtist = cleanText(artist).split(/ & | and |, | x | X | feat\. | feat | ft\. | ft | featuring | with /i)[0].trim();
  const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanedTitle + ' ' + cleanedArtist)}`;
  const res = await fetch(searchUrl);
  const results = await res.json();
  if (Array.isArray(results) && results.length > 0) {
    const bestMatch = results[0];
    const lrc = bestMatch.syncedLyrics || bestMatch.plainLyrics || '';
    if (lrc) {
      console.log(`[lyricsService] LrcLib search lyrics loaded successfully!`);
      return parseLrc(lrc);
    }
  }
  throw new Error('No search results found');
}

async function queryLrcLibGetOrSearch(title: string, artist: string, duration: number): Promise<LrcLine[]> {
  const cleanedTitle = cleanText(title);
  const cleanedArtist = cleanText(artist).split(/ & | and |, | x | X | feat\. | feat | ft\. | ft | featuring | with /i)[0].trim();

  const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanedTitle)}&artist_name=${encodeURIComponent(cleanedArtist)}&duration=${Math.round(duration)}`;
  const res = await fetch(url);
  if (res.status === 404) {
    console.log(`[lyricsService] LrcLib /get returned 404. Trying /search...`);
    return await queryLrcLibSearch(title, artist);
  }
  const data = await res.json();
  const lrc = data.syncedLyrics || data.plainLyrics || '';
  if (lrc) {
    console.log(`[lyricsService] LrcLib lyrics loaded successfully!`);
    return parseLrc(lrc);
  } else {
    return [{ time: -1, text: 'Lyrics not available' }];
  }
}

export async function fetchLyricsFromApis(
  title: string,
  artist: string,
  duration: number,
  videoId: string,
  force = false
): Promise<LrcLine[]> {
  if (videoId.startsWith('yt-')) {
    videoId = videoId.substring(3);
  }

  // Try reading local file cache first
  try {
    const activeDir = await getActiveDirectory();
    const lrcUri = `${activeDir}${videoId}.lrc`;
    const info = await getInfoAsync(lrcUri);
    if (info.exists) {
      const content = await readAsStringAsync(lrcUri);
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (__DEV__) console.log(`[lyricsService] Loaded lyrics from local downloaded file: ${lrcUri}`);
        LYRICS_CACHE.set(videoId, parsed);
        return parsed;
      }
    }
  } catch (err) {
    if (__DEV__) console.warn('[lyricsService] Failed to read local lrc file:', err);
  }

  if (!force && LYRICS_CACHE.has(videoId)) {
    const cached = LYRICS_CACHE.get(videoId);
    if (cached) return cached;
  }

  if (force) {
    try {
      const lines = await queryLrcLibSearch(title, artist);
      LYRICS_CACHE.set(videoId, lines);
      return lines;
    } catch (err) {
      console.warn('[lyricsService] Force fetch failed:', err);
      const fallback = [{ time: -1, text: 'Lyrics not found' }];
      LYRICS_CACHE.set(videoId, fallback);
      return fallback;
    }
  }

  // 1. Try SimpMusic first
  try {
    console.log(`[lyricsService] Fetching SimpMusic lyrics for: ${videoId}`);
    const res = await fetch(`https://api-lyrics.simpmusic.org/v1/${videoId}`);
    const resJson = await res.json();
    if (resJson.success && resJson.data && resJson.data.length > 0) {
      const match = resJson.data[0];
      const lrc = match.richSyncLyrics || match.syncedLyrics || match.plainLyrics || '';
      if (lrc) {
        console.log(`[lyricsService] SimpMusic lyrics loaded successfully!`);
        const lines = parseLrc(lrc);
        LYRICS_CACHE.set(videoId, lines);
        return lines;
      }
    }
  } catch (err: any) {
    console.log(`[lyricsService] SimpMusic failed, falling back to LrcLib:`, err.message);
  }

  // 2. Fall back to LrcLib
  try {
    const lines = await queryLrcLibGetOrSearch(title, artist, duration);
    LYRICS_CACHE.set(videoId, lines);
    return lines;
  } catch (err) {
    console.warn('[lyricsService] LrcLib fetch failed:', err);
    const fallback = [{ time: -1, text: 'Lyrics not found' }];
    LYRICS_CACHE.set(videoId, fallback);
    return fallback;
  }
}
