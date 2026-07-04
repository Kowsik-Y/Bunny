let cachedSts: number | null = null;
let lastStsFetch = 0;

export async function getSignatureTimestamp(videoId?: string): Promise<number> {
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
