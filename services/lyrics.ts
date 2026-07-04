// ─────────────────────────────────────────────────────────────
// Synced LRC parser, Clean text & Fetch API Services
// ─────────────────────────────────────────────────────────────

export interface LrcLine {
  time: number;
  text: string;
}

export function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\s*\(.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\)/gi, '')
    .replace(/\s*\[.*?(official|video|audio|lyrics|lyric|visualizer|hd|hq|4k|remaster|remix|live|acoustic|version|edit|extended|radio|clean|explicit).*?\]/gi, '')
    .replace(/\s*【.*?】/g, '')
    .replace(/\s*\|.*$/g, '')
    .replace(/\s*-\s*(official|video|audio|lyrics|lyric|visualizer).*$/gi, '')
    .trim();
}

export function parseLrc(lrcText: string): LrcLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result: LrcLine[] = [];
  const timeRegex = /\[(\d+):(\d+(?:\.\d+)?)\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseFloat(match[2]);
      // Remove all bracket timestamp tags (including duplicate timestamps on the same line)
      const rawText = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
      // Remove inline word-level tags like <00:12.34> or formatting tags, and normalize spacing
      const text = rawText.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      if (text) {
        result.push({ time: min * 60 + sec, text });
      }
    } else {
      const cleanLine = line.trim();
      if (cleanLine && !cleanLine.startsWith('[')) {
        const text = cleanLine.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if (text) {
          result.push({ time: -1, text });
        }
      }
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

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

// Shared in-memory cache to persist lyrics across mounts/remounts and background pre-fetches
export const LYRICS_CACHE = new Map<string, LrcLine[]>();

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

  // Check shared in-memory cache first if not forced
  if (!force && LYRICS_CACHE.has(videoId)) {
    const cached = LYRICS_CACHE.get(videoId);
    if (cached) return cached;
  }

  // If force is true, bypass SimpMusic and query LrcLib directly via search
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
