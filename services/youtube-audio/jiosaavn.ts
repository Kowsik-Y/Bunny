const SAAVN_SERVERS = [
  'https://saavn.echomusic.fun',
  'https://jiosaavn-api.pc-adityadav9532.workers.dev',
  'https://jiosaavn-api.mac-adityadav9532.workers.dev',
];

async function fetchSaavn(endpoint: string, params: Record<string, string>): Promise<any> {
  const queryStr = new URLSearchParams(params).toString();
  let lastError: any = null;
  for (const server of SAAVN_SERVERS) {
    try {
      const url = `${server}/api/${endpoint}?${queryStr}`;
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EchoMusic/1.0',
        },
      });
      if (res.ok) {
        return await res.json();
      }
      if (res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('All Saavn servers failed');
}

function saavnNormalize(val: string): string {
  return val
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function wordOverlapScore(a: string, b: string, maxPts: number): number {
  const setA = new Set(saavnNormalize(a).split(' ').filter(x => x.length > 1));
  const setB = new Set(saavnNormalize(b).split(' ').filter(x => x.length > 1));
  if (setA.size === 0 || setB.size === 0) return 0;
  
  let common = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      common++;
    }
  }
  const ratio = common / Math.max(setA.size, setB.size);
  return Math.floor(ratio * maxPts);
}

function variantPenalty(ytTitle: string, candidateName: string): number {
  const VARIANT_PENALTY = -40;
  const variantMarkerPhrases = [
    'karaoke',
    'instrumental',
    'minus one',
    'cover',
    'remix',
    'lo-fi',
    'lofi',
    'sped up',
    'slowed',
    'reverb',
  ];
  
  const normalizedYtTitle = ` ${saavnNormalize(ytTitle)} `;
  const normalizedCandidateName = ` ${saavnNormalize(candidateName)} `;
  let penalty = 0;
  
  for (const phrase of variantMarkerPhrases) {
    const marker = ` ${saavnNormalize(phrase)} `;
    if (!normalizedYtTitle.includes(marker) && normalizedCandidateName.includes(marker)) {
      penalty += VARIANT_PENALTY;
    }
  }
  return penalty;
}

export async function resolveJioSaavn(
  videoId: string,
  ytTitle: string,
  ytArtist: string,
  ytDuration: number
): Promise<any> {
  const cleanArtist = ytArtist.replace(/\s*-\s*Topic\b/gi, '').trim();
  const query = `${ytTitle} ${cleanArtist}`
    .replace(/&/g, ' ')
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (__DEV__) console.log(`[JioSaavn Fallback] Searching JioSaavn for: "${query}"`);
  
  const searchRes = await fetchSaavn('search/songs', { query, limit: '5' });
  const results = searchRes?.data?.results || [];
  if (!searchRes?.success || results.length === 0) {
    throw new Error(`No songs found on JioSaavn for: "${query}"`);
  }

  const scored = results.map((candidate: any) => {
    let score = 0;
    score += wordOverlapScore(ytTitle, candidate.name, 50);
    const saavnDuration = candidate.duration ? parseInt(candidate.duration, 10) : 0;
    if (ytDuration > 0 && saavnDuration > 0) {
      const diff = Math.abs(ytDuration - saavnDuration);
      if (diff <= 5) {
        score += 30;
      } else if (diff <= 15) {
        score += 15;
      }
    }
    const saavnArtists = (candidate.artists?.primary || []).map((a: any) => a.name).join(' ');
    score += wordOverlapScore(cleanArtist, saavnArtists, 20);
    if (candidate.explicitContent) {
      score += 5;
    }
    score += variantPenalty(ytTitle, candidate.name);
    return { song: candidate, score };
  });

  const MIN_CONFIDENCE = 40;
  let bestMatch: any = null;
  let maxScore = -9999;
  for (const item of scored) {
    if (item.score > maxScore) {
      maxScore = item.score;
      bestMatch = item.song;
    }
  }

  if (!bestMatch || maxScore < MIN_CONFIDENCE) {
    throw new Error(`JioSaavn: best score (${maxScore}) below threshold ${MIN_CONFIDENCE}`);
  }

  if (__DEV__) console.log(`[JioSaavn Fallback] Best match: "${bestMatch.name}" (id: ${bestMatch.id}, score: ${maxScore})`);

  const songRes = await fetchSaavn(`songs/${bestMatch.id}`, {});
  if (!songRes?.success || !songRes.data || songRes.data.length === 0) {
    throw new Error(`JioSaavn: failed to get details for songId ${bestMatch.id}`);
  }

  const urls = (songRes.data[0]?.downloadUrl || []).filter((u: any) => u.url && u.url.trim() !== '');
  if (urls.length === 0) {
    throw new Error(`JioSaavn: no stream URL found for songId ${bestMatch.id}`);
  }

  let streamUrl = urls.find((u: any) => u.quality?.toLowerCase() === '320kbps')?.url;
  if (!streamUrl) {
    streamUrl = urls.find((u: any) => u.quality?.toLowerCase() === '160kbps')?.url;
  }
  if (!streamUrl) {
    streamUrl = urls[urls.length - 1].url;
  }

  const thumbnail = bestMatch.image?.[bestMatch.image.length - 1]?.url || bestMatch.image?.[0]?.url || null;
  const duration = bestMatch.duration ? parseInt(bestMatch.duration, 10) : ytDuration;

  const bestFormat = {
    url: streamUrl,
    mimeType: 'audio/mp4; codecs="mp4a.40.2"',
    format: 'MP4',
    quality: '320kbps',
    bitrate: 320000,
    itag: 0,
  };

  return {
    videoId,
    title: bestMatch.name,
    artist: (bestMatch.artists?.primary || []).map((a: any) => a.name).join(', '),
    duration,
    thumbnail,
    best: bestFormat,
    allAudio: [bestFormat],
    videoUrl: null,
    client: 'JIOSAAVN_FALLBACK',
    streamUA: 'EchoMusic/1.0',
    track: {
      id: videoId,
      url: streamUrl,
      title: bestMatch.name,
      artist: (bestMatch.artists?.primary || []).map((a: any) => a.name).join(', '),
      artwork: thumbnail || undefined,
      duration,
      allAudio: [bestFormat],
      activeItag: 0,
      allVideo: [],
      activeVideoItag: undefined,
      headers: { 'User-Agent': 'EchoMusic/1.0' },
      userAgent: 'EchoMusic/1.0',
    },
  };
}
