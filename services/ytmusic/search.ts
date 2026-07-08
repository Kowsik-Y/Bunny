import { Platform } from 'react-native';
import { pipedService } from '../piped';
import { CategorizedSearchResults, YtMusicSearchResult } from './types';
import { upgradeThumbQuality } from './utils';
import exportedModule from '../../modules/innertube';

function mapYTItem(item: any, sectionTitle?: string): YtMusicSearchResult {
  let type: 'song' | 'video' | 'artist' | 'album' | 'playlist' = 'song';
  
  if (item.musicVideoType || (item.artists && item.album !== undefined)) {
    const isVideo = item.musicVideoType && item.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV';
    type = isVideo ? 'video' : 'song';
  } else if (item.browseId || item.playlistId) {
    type = 'album';
  } else if (item.songCountText || item.author) {
    type = 'playlist';
  } else if (sectionTitle === 'Artists' || (!item.artists && !item.album && item.id)) {
    type = 'artist';
  }

  const artistName = item.artists?.map((a: any) => a.name).join(', ') || item.author?.name || '';
  
  return {
    type,
    id: item.id || item.browseId || '',
    title: item.title || item.name || '',
    name: item.name || item.title || '',
    artist: artistName || item.artist || '',
    album: item.album?.name || '',
    duration: item.duration || undefined,
    thumbnail: upgradeThumbQuality(item.thumbnail),
    url: type === 'song' || type === 'video' ? `https://music.youtube.com/watch?v=${item.id}` : undefined,
    artistId: item.artists?.[0]?.id || item.author?.id,
    albumId: item.album?.id || item.playlistId,
    artists: item.artists?.map((a: any) => ({ name: a.name, id: a.id || '' })),
    explicit: item.explicit || false,
  };
}

export async function searchYtMusic(query: string): Promise<CategorizedSearchResults> {
  const q = query.trim();
  if (!q) return { songs: [], videos: [], artists: [], albums: [], playlists: [] };

  if (Platform.OS === 'android') {
    try {
      const data = await exportedModule.searchSummary(q);
      
      const songs: YtMusicSearchResult[] = [];
      const videos: YtMusicSearchResult[] = [];
      const artists: YtMusicSearchResult[] = [];
      const albums: YtMusicSearchResult[] = [];
      const playlists: YtMusicSearchResult[] = [];

      for (const summary of data.summaries || []) {
        const title = summary.title || '';
        const items = summary.items || [];

        for (const item of items) {
          const mapped = mapYTItem(item, title);
          if (mapped.type === 'song') songs.push(mapped);
          else if (mapped.type === 'video') videos.push(mapped);
          else if (mapped.type === 'artist') artists.push(mapped);
          else if (mapped.type === 'album') albums.push(mapped);
          else if (mapped.type === 'playlist') playlists.push(mapped);
        }
      }

      return { songs, videos, artists, albums, playlists };
    } catch (e) {
      console.warn("Android native searchSummary failed, falling back to Piped:", e);
    }
  }

  // Fallback (iOS and Android fallback)
  try {
    const [songsData, videosData, artistsData, albumsData, playlistsData] = await Promise.all([
      pipedService.search(q, "music_songs"),
      pipedService.search(q, "music_videos"),
      pipedService.search(q, "channels"),
      pipedService.search(q, "albums"),
      pipedService.search(q, "playlists"),
    ]);

    const songs: YtMusicSearchResult[] = [];
    const videos: YtMusicSearchResult[] = [];
    const artists: YtMusicSearchResult[] = [];
    const albums: YtMusicSearchResult[] = [];
    const playlists: YtMusicSearchResult[] = [];

    // Songs
    for (const item of songsData?.items ?? []) {
      const videoId = item.url?.split("v=")[1] || item.url?.split("/").pop() || "";
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
        explicit: item.explicit,
      });
    }

    // Videos
    for (const item of videosData?.items ?? []) {
      const videoId = item.url?.split("v=")[1] || item.url?.split("/").pop() || "";
      videos.push({
        type: "video",
        id: videoId,
        title: item.title,
        artist: item.uploaderName || "Unknown Artist",
        duration: item.duration,
        thumbnail: upgradeThumbQuality(item.thumbnail),
        url: `https://music.youtube.com/watch?v=${videoId}`,
        explicit: item.explicit,
      });
    }

    // Artists
    for (const item of artistsData?.items ?? []) {
      const channelId = item.url?.split("/channel/")[1] || item.url?.split("/").pop() || "";
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
      const albumId = item.url?.split("list=")[1] || item.url?.split("/").pop() || "";
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
      const playlistId = item.url?.split("list=")[1] || item.url?.split("/").pop() || "";
      if (!playlistId || playlistId.startsWith("RDEM")) continue;
      playlists.push({
        type: "playlist",
        id: playlistId,
        title: item.name || item.title,
        artist: item.uploaderName || "Unknown Artist",
        thumbnail: upgradeThumbQuality(item.thumbnail),
      });
    }

    return { songs, videos, artists, albums, playlists };
  } catch (e) {
    console.error("Failed to search YTMusic:", e);
    return { songs: [], videos: [], artists: [], albums: [], playlists: [] };
  }
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  const q = query.trim();
  if (!q) return [];

  if (Platform.OS === 'android') {
    try {
      const data = await exportedModule.searchSuggestions(q);
      if (data && Array.isArray(data.queries)) {
        return data.queries;
      }
    } catch (e) {
      console.warn("Android native searchSuggestions failed:", e);
    }
  }

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

export async function searchCategoryYtMusic(query: string, category: 'song' | 'video' | 'artist' | 'album' | 'playlist'): Promise<YtMusicSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (Platform.OS === 'android') {
    try {
      let filterName = 'SONG';
      if (category === 'video') filterName = 'VIDEO';
      else if (category === 'artist') filterName = 'ARTIST';
      else if (category === 'album') filterName = 'ALBUM';
      else if (category === 'playlist') filterName = 'COMMUNITY_PLAYLIST';

      const data = await exportedModule.search(q, filterName);
      return (data.items || []).map((item: any) => mapYTItem(item, category === 'artist' ? 'Artists' : undefined));
    } catch (e) {
      console.warn("Android native search failed for category:", category, e);
    }
  }

  // Fallback using Piped
  try {
    let pipedFilter = "music_songs";
    if (category === "video") pipedFilter = "music_videos";
    else if (category === "artist") pipedFilter = "channels";
    else if (category === "album") pipedFilter = "albums";
    else if (category === "playlist") pipedFilter = "playlists";

    const res = await pipedService.search(q, pipedFilter);
    return (res?.items ?? []).map((item: any) => {
      const id = item.url?.split("v=")[1] || item.url?.split("list=")[1] || item.url?.split("/").pop() || "";
      return {
        type: category,
        id,
        title: item.title || item.name || "",
        name: item.name || item.title || "",
        artist: item.uploaderName || "Unknown Artist",
        thumbnail: upgradeThumbQuality(item.thumbnail),
        duration: item.duration,
        explicit: item.explicit,
      };
    });
  } catch (e) {
    console.error("Failed category search:", e);
    return [];
  }
}

