const INNERTUBE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Goog-Api-Format-Version': '1',
  'X-YouTube-Client-Name': '67',
  'X-YouTube-Client-Version': '1.20260213.01.00',
  'Origin': 'https://music.youtube.com',
  'Referer': 'https://music.youtube.com/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
};

const INNERTUBE_CONTEXT = {
  client: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20260213.01.00',
    hl: 'en',
    gl: 'US',
    timeZone: 'UTC',
    utcOffsetMinutes: 0,
  }
};

const API_KEY = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX3';

export function findRenderer(obj: any, key: string): any {
  if (!obj || typeof obj !== 'object') return null;
  if (obj[key]) return obj[key];
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      const found = findRenderer(obj[k], key);
      if (found) return found;
    }
  }
  return null;
}

export async function postInnerTube(endpoint: string, body: any): Promise<any> {
  const url = `https://music.youtube.com/youtubei/v1/${endpoint}?key=${API_KEY}&prettyPrint=false`;
  const res = await fetch(url, {
    method: 'POST',
    headers: INNERTUBE_HEADERS,
    body: JSON.stringify({
      context: INNERTUBE_CONTEXT,
      ...body
    })
  });
  if (!res.ok) {
    throw new Error(`InnerTube request failed: ${res.status}`);
  }
  return await res.json();
}
