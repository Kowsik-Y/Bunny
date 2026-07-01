import * as FileSystem from 'expo-file-system';
import { pipedService } from './piped';
import { resolveAudio } from './useYouTubeAudio';

export type YtMusicSearchResult = {
  type: 'song' | 'artist' | 'album' | 'playlist';
  id: string;
  title?: string;
  name?: string;
  artist?: string;
  album?: string;
  duration?: number;
  thumbnail?: string | null;
  url?: string;
  subscribers?: string;
  artistId?: string;
  albumId?: string;
  artists?: { name: string; id: string }[];
};

export type CategorizedSearchResults = {
  songs: YtMusicSearchResult[];
  artists: YtMusicSearchResult[];
  albums: YtMusicSearchResult[];
  playlists: YtMusicSearchResult[];
};

export type YtMusicResolve = {
  id: string;
  title?: string;
  artist?: string;
  duration?: number;
  thumbnail?: string | null;
  streamUrl: string;
  ext?: string;
  webpageUrl?: string;
  headers?: Record<string, string>;
  userAgent?: string;
};

export async function searchYtMusic(query: string): Promise<CategorizedSearchResults> {
  const q = query.trim();
  if (!q) return { songs: [], artists: [], albums: [], playlists: [] };

  try {
    const [songsData, artistsData, albumsData, playlistsData] = await Promise.all([
      pipedService.search(q, "music_songs"),
      pipedService.search(q, "channels"),
      pipedService.search(q, "albums"),
      pipedService.search(q, "playlists"),
    ]);

    const songs: YtMusicSearchResult[] = [];
    const artists: YtMusicSearchResult[] = [];
    const albums: YtMusicSearchResult[] = [];
    const playlists: YtMusicSearchResult[] = [];

    // Songs
    for (const item of songsData?.items ?? []) {
      const videoId =
        item.url?.split("v=")[1] ||
        item.url?.split("/").pop() ||
        "";

      songs.push({
        type: "song",
        id: videoId,
        title: item.title,
        artist: item.uploaderName || "Unknown Artist",
        album: item.albumName || "Single",
        duration: item.duration,
        thumbnail: upgradeThumbQuality(item.thumbnail),
        url: `https://music.youtube.com/watch?v=${videoId}`,
        artistId: item.artistId,
        albumId: item.albumId,
        artists: item.artists,
      });
    }

    // Artists
    for (const item of artistsData?.items ?? []) {
      const channelId =
        item.url?.split("/channel/")[1] ||
        item.url?.split("/").pop() ||
        "";

      artists.push({
        type: "artist",
        id: channelId,
        name: item.name || item.title,
        thumbnail: upgradeThumbQuality(item.thumbnail),
        subscribers: item.subscribers,
      });
    }

    // Albums
    for (const item of albumsData?.items ?? []) {
      const albumId =
        item.url?.split("list=")[1] ||
        item.url?.split("/").pop() ||
        "";

      // Skip YouTube Mixes
      if (!albumId || albumId.startsWith("RDEM")) continue;

      albums.push({
        type: "album",
        id: albumId,
        title: item.name || item.title,
        artist: item.uploaderName || "Unknown Artist",
        thumbnail: upgradeThumbQuality(item.thumbnail),
      });
    }

    // Playlists
    for (const item of playlistsData?.items ?? []) {
      const playlistId =
        item.url?.split("list=")[1] ||
        item.url?.split("/").pop() ||
        "";

      // Skip YouTube Mixes
      if (!playlistId || playlistId.startsWith("RDEM")) continue;

      playlists.push({
        type: "playlist",
        id: playlistId,
        title: item.name || item.title,
        artist: item.uploaderName || "Unknown Artist",
        thumbnail: upgradeThumbQuality(item.thumbnail),
      });
    }

    return { songs, artists, albums, playlists };
  } catch (e) {
    console.error("Failed to search YTMusic:", e);
    return { songs: [], artists: [], albums: [], playlists: [] };
  }
}
export async function getSearchSuggestions(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const res = await fetch(
      `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
        return data[1];
      }
    }
  } catch (e) {
    console.error('Failed to get search suggestions client-side:', e);
  }
  return [];
}

export async function getArtistDetails(id: string): Promise<any> {
  try {
    const data = await pipedService.getChannel(id);

    return {
      name: data.name,
      thumbnails: data.avatarUrl ? [{ url: data.avatarUrl }] : [],
      subscribers: data.subscriberCount ? `${data.subscriberCount.toLocaleString()} subscribers` : undefined,
      sections: data.sections || [],
    };
  } catch (e) {
    console.error('Failed to get artist details client-side:', e);
    throw e;
  }
}

export async function getAlbumDetails(id: string): Promise<any> {
  try {
    const data = await pipedService.getPlaylist(id);
    const tracks = (data.relatedStreams || []).map((stream: any, index: number) => {
      const videoId = stream.url.split('v=')[1] || stream.url.split('/').pop() || '';
      return {
        index,
        videoId,
        name: stream.title,
        duration: (stream.duration || 0) * 1000,
        albumId: id,
        artistId: data.artistId,
        artists: data.artistId ? [{ name: data.uploader || 'Unknown Artist', id: data.artistId }] : undefined,
      };
    });

    return {
      name: data.name,
      artist: data.uploader || 'Unknown Artist',
      artistId: data.artistId,
      thumbnails: data.thumbnailUrl ? [{ url: data.thumbnailUrl }] : [],
      tracks,
    };
  } catch (e) {
    console.error('Failed to get album details client-side:', e);
    throw e;
  }
}

export async function getPlaylistDetails(id: string): Promise<any> {
  try {
    const data = await pipedService.getPlaylist(id);
    const tracks = (data.relatedStreams || []).map((stream: any, index: number) => {
      const videoId = stream.url.split('v=')[1] || stream.url.split('/').pop() || '';
      return {
        id: videoId,
        title: stream.title,
        artist: data.uploader || 'Unknown Artist',
        album: data.name || 'Playlist',
        artwork: data.thumbnailUrl || '',
        duration: stream.duration || 0,
        url: `https://music.youtube.com/watch?v=${videoId}`,
        artistId: data.artistId,
        albumId: id,
        artists: data.artistId ? [{ name: data.uploader || 'Unknown Artist', id: data.artistId }] : undefined,
      };
    });

    return {
      name: data.name,
      uploader: data.uploader || 'Unknown Artist',
      thumbnailUrl: data.thumbnailUrl,
      tracks,
    };
  } catch (e) {
    console.error('Failed to get playlist details client-side:', e);
    throw e;
  }
}

export async function resolveYtMusic(url: string): Promise<YtMusicResolve> {
  try {
    const videoId = url.split('v=')[1] || url.split('/').pop() || '';
    const res = await resolveAudio(videoId);
    return {
      id: res.videoId,
      title: res.title,
      artist: res.artist,
      duration: res.duration,
      thumbnail: res.thumbnail,
      streamUrl: res.best.url,
      ext: res.best.format?.toLowerCase() || 'm4a',
      webpageUrl: `https://music.youtube.com/watch?v=${res.videoId}`,
      headers: res.track.headers,
      userAgent: res.track.userAgent,
    };
  } catch (e) {
    console.error('Failed to resolve YTMusic client-side:', e);
    throw e;
  }
}

function sanitizeFilename(input: string): string {
  return input
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

export async function downloadYtMusic(
  streamUrl: string,
  title: string,
  ext = 'm4a'
): Promise<string> {
  const safe = sanitizeFilename(title || 'track') || 'track';
  // Create a Directory instance for Documents/ytmusic and ensure it exists
  const dir = new FileSystem.Directory(FileSystem.Paths.document, 'ytmusic');
  try {
    dir.create({ intermediates: true });
  } catch (_) {
    // ignore
  }
  // Create a File instance for the target file
  const targetFile = new FileSystem.File(dir, `${safe}.${ext}`);
  // Use the new File.downloadFileAsync API which returns a File instance
  const downloaded = await FileSystem.File.downloadFileAsync(streamUrl, targetFile);
  return downloaded.uri;
}

export function upgradeThumbQuality(url?: string | null): string {
  const fallback = 'https://picsum.photos/400/400';
  if (!url) return fallback;

  // 1. Google user content / ggpht resize parameter upgrade (e.g. w120-h120)
  if (url.includes('googleusercontent.com') || url.includes('ggpht.com')) {
    if (url.includes('=')) {
      return url.split('=')[0] + '=w544-h544-l90-rj';
    }
  }

  // 2. Youtube standard thumbnail upgrade
  const upgraded = url
    .replace(/\/(?:default|mqdefault|hqdefault|sddefault|maxresdefault)\.(?:jpg|webp|png)/i,
             '/maxresdefault.jpg');
  return upgraded;
}
