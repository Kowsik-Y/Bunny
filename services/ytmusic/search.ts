import { pipedService } from '../piped';
import { CategorizedSearchResults, YtMusicSearchResult } from './types';
import { upgradeThumbQuality } from './utils';

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
