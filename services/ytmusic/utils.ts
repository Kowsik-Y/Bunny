export function sanitizeFilename(input: string): string {
  return input
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export function upgradeThumbQuality(url?: string | null): string {
  const fallback = 'https://picsum.photos/400/400';
  if (!url) return fallback;

  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    if (url.includes('=')) {
      return url.split('=')[0] + '=w544-h544-l90-rj';
    }
  }

  const upgraded = url
    .replace(/\/(?:default|mqdefault|hqdefault|sddefault|maxresdefault)\.(?:jpg|webp|png)/i,
             '/maxresdefault.jpg');
  return upgraded;
}
