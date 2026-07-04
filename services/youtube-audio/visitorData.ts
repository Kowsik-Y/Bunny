const FALLBACK_VISITOR_DATA = 'CgtVXzcwWng2R29DdyiL257SBjIKCgJJThIEGgAgGmLfAgrcAjE5LllUPVpvd2l1RXJxNXRIV1N4bE80bG5aaXNaTzZPSFJad0p2amRkREFRT3JhS21DeS1MUzM5NktRVmV6MXlPam8yRlRyYkY5Z3NfajZXMjlMS0tjOGdkMmFLb1R0amhiUngyT2E2N2drS2hvd2JScUtmV0xNRERya3ZSdGFNSW9Gb1BMYldQQTRIMWRvWjFrU21vNGJHdm95WlhUZWVNNXZyVkV1bTIzSWV6TUdkZVNuNXpCdEJSLXYzd3NaOWFsLTg3WlUwWWN2YlREcTVpRWtrRnA0VXVqTDZuTDdXM19ZVG03M0ZqVllxcW13aVc0S3JBTUZXb0hJXzFOc3U3SGlzYjlyR3I2QXJ6bko4Z2JxdHlTM3N3cDl3UzdZaEdCU2FmcEUzRWVFRXBCSktTdThIdkExMkxqR1lSVDhTdXVVcDJERWlGdmdSMjI5a2NMekZDNDhvWkNaQQ==';

export let cachedVisitorData: string | null = null;

export function invalidateVisitorData() {
  cachedVisitorData = null;
}

export function findVisitorData(obj: any): string | null {
  if (typeof obj === 'string') {
    if (/^Cg[t|s]/.test(obj)) {
      return decodeURIComponent(obj);
    }
    try {
      const decoded = decodeURIComponent(obj);
      if (/^Cg[t|s]/.test(decoded)) {
        return decoded;
      }
    } catch { }
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

export async function getVisitorData(): Promise<string | null> {
  if (cachedVisitorData) return cachedVisitorData;

  // Try Source 1: sw.js_data
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

  // Fallback
  cachedVisitorData = FALLBACK_VISITOR_DATA;
  return cachedVisitorData;
}
