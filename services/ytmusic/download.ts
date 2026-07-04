import * as FileSystem from 'expo-file-system';
import { sanitizeFilename } from './utils';

export async function downloadYtMusic(
  streamUrl: string,
  title: string,
  ext = 'm4a'
): Promise<string> {
  const safe = sanitizeFilename(title || 'track') || 'track';
  const dir = new FileSystem.Directory(FileSystem.Paths.document, 'ytmusic');
  try {
    dir.create({ intermediates: true });
  } catch (_) {
    // ignore
  }
  const targetFile = new FileSystem.File(dir, `${safe}.${ext}`);
  const downloaded = await FileSystem.File.downloadFileAsync(streamUrl, targetFile);
  return downloaded.uri;
}
