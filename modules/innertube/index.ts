import { Platform } from 'react-native';
import InnertubeModule from './src/InnertubeModule';
import { pipedService } from '../../services/piped';

export interface InnertubeInterface {
  searchSuggestions(query: string): Promise<any>;
  searchSummary(query: string): Promise<any>;
  search(query: string, filter: string): Promise<any>;
  album(browseId: string): Promise<any>;
  artist(browseId: string): Promise<any>;
  playlist(playlistId: string): Promise<any>;
  lyrics(browseId: string): Promise<any>;
  player(videoId: string): Promise<any>;
  showDownloadProgressNotification(notificationId: string, title: string, progress: number, totalSongs: number, currentSongIndex: number): Promise<void>;
  showDownloadCompleteNotification(notificationId: string, title: string): Promise<void>;
  showDownloadCancelledNotification(notificationId: string): Promise<void>;
  showDownloadPausedNotification(notificationId: string, title: string): Promise<void>;
  showDownloadFailedNotification(notificationId: string, title: string, reason: string): Promise<void>;
}

const fallbackInnertube: InnertubeInterface = {
  async searchSuggestions(query: string) {
    try {
      const res = await fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
          return { queries: data[1], recommendedItems: [] };
        }
      }
    } catch (e) {
      console.error('Fallback searchSuggestions failed:', e);
    }
    return { queries: [], recommendedItems: [] };
  },

  async searchSummary(query: string) {
    try {
      const [songsData, artistsData, playlistsData] = await Promise.all([
        pipedService.search(query, "music_songs"),
        pipedService.search(query, "channels"),
        pipedService.search(query, "playlists"),
      ]);

      const summaries = [];
      if (songsData?.items?.length) {
        summaries.push({
          title: "Songs",
          items: songsData.items.map((item: any) => ({
            type: "song",
            id: item.url?.split("v=")[1] || item.url?.split("/").pop() || "",
            title: item.title,
            artists: [{ name: item.uploaderName || "Unknown Artist" }],
            duration: item.duration,
            thumbnail: item.thumbnail,
          }))
        });
      }
      if (artistsData?.items?.length) {
        summaries.push({
          title: "Artists",
          items: artistsData.items.map((item: any) => ({
            type: "artist",
            id: item.url?.split("/channel/")[1] || item.url?.split("/").pop() || "",
            name: item.name || item.title,
            thumbnail: item.thumbnail,
          }))
        });
      }
      if (playlistsData?.items?.length) {
        summaries.push({
          title: "Playlists",
          items: playlistsData.items.map((item: any) => ({
            type: "playlist",
            id: item.url?.split("list=")[1] || item.url?.split("/").pop() || "",
            title: item.name || item.title,
            thumbnail: item.thumbnail,
          }))
        });
      }

      return { summaries };
    } catch (e) {
      console.error('Fallback searchSummary failed:', e);
      return { summaries: [] };
    }
  },

  async search(query: string, filter: string) {
    try {
      let pipedFilter = "music_songs";
      if (filter === "SONG") pipedFilter = "music_songs";
      else if (filter === "VIDEO") pipedFilter = "music_videos";
      else if (filter === "ALBUM") pipedFilter = "music_albums";
      else if (filter === "ARTIST") pipedFilter = "music_artists";
      else if (filter === "COMMUNITY_PLAYLIST" || filter === "FEATURED_PLAYLIST") pipedFilter = "playlists";

      const res = await pipedService.search(query, pipedFilter);
      return {
        items: (res?.items || []).map((item: any) => ({
          id: item.url?.split("v=")[1] || item.url?.split("list=")[1] || item.url?.split("/").pop() || "",
          title: item.title || item.name,
          thumbnail: item.thumbnail,
          uploaderName: item.uploaderName || "",
        }))
      };
    } catch (e) {
      console.error('Fallback search failed:', e);
      return { items: [] };
    }
  },

  async album(browseId: string) {
    try {
      const data = await pipedService.getPlaylist(browseId);
      return {
        title: data.name,
        artists: [{ name: data.uploader || 'Unknown Artist' }],
        thumbnails: data.thumbnailUrl ? [{ url: data.thumbnailUrl }] : [],
        tracks: (data.relatedStreams || []).map((stream: any, index: number) => ({
          id: stream.url.split('v=')[1] || stream.url.split('/').pop() || '',
          title: stream.title,
          duration: (stream.duration || 0) * 1000,
        }))
      };
    } catch (e) {
      console.error('Fallback album failed:', e);
      return null;
    }
  },

  async artist(browseId: string) {
    try {
      const data = await pipedService.getChannel(browseId);
      return {
        name: data.name,
        thumbnails: data.avatarUrl ? [{ url: data.avatarUrl }] : [],
        sections: data.sections || [],
      };
    } catch (e) {
      console.error('Fallback artist failed:', e);
      return null;
    }
  },

  async playlist(playlistId: string) {
    try {
      const data = await pipedService.getPlaylist(playlistId);
      return {
        title: data.name,
        author: data.uploader || 'Unknown Artist',
        tracks: (data.relatedStreams || []).map((stream: any) => ({
          id: stream.url.split('v=')[1] || stream.url.split('/').pop() || '',
          title: stream.title,
          duration: stream.duration || 0,
        }))
      };
    } catch (e) {
      console.error('Fallback playlist failed:', e);
      return null;
    }
  },

  async lyrics(browseId: string) {
    return null;
  },

  async player(videoId: string) {
    try {
      const response = await fetch(`https://music.youtube.com/youtubei/v1/player?key=AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX3`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20260213.01.00' } },
          videoId
        })
      });
      return await response.json();
    } catch (e) {
      console.error('Fallback player failed:', e);
      return null;
    }
  },

  async showDownloadProgressNotification(notificationId: string, title: string, progress: number, totalSongs: number, currentSongIndex: number): Promise<void> {},
  async showDownloadCompleteNotification(notificationId: string, title: string): Promise<void> {},
  async showDownloadCancelledNotification(notificationId: string): Promise<void> {},
  async showDownloadPausedNotification(notificationId: string, title: string): Promise<void> {},
  async showDownloadFailedNotification(notificationId: string, title: string, reason: string): Promise<void> {},
};

const exportedModule: InnertubeInterface = Platform.OS === 'android' ? InnertubeModule : fallbackInnertube;
export default exportedModule;
