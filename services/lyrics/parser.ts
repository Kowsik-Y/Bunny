import { LrcLine } from './types';

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
      const rawText = line.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
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
