export interface PipedSession {
  apiBaseUrl: string;
  token: string;
}

export interface PipedInstance {
  name: string;
  api_url: string;
  locations?: string;
  version?: string;
  up?: boolean;
}

export interface PipedPlaylistPreview {
  id: string;
  name: string;
  thumbnail: string;
  videos: number;
}

export interface PipedPlaylist {
  name: string;
  thumbnailUrl: string;
  uploader: string;
  videos: number;
  relatedStreams: any[];
}

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

function findRenderer(obj: any, key: string): any {
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

async function postInnerTube(endpoint: string, body: any): Promise<any> {
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

class PipedService {
  private parseDuration(timeStr: string): number | null {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
  }

  private parseCardShelf(renderer: any, filter: string): any {
    const thumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
    const thumbnail = thumbs.length ? thumbs[thumbs.length - 1].url : null;

    const title = renderer.title?.runs?.[0]?.text;
    if (!title) return null;

    const subtitleRuns = renderer.subtitle?.runs ?? [];
    const runGroups: any[][] = [[]];
    for (const run of subtitleRuns) {
      if (run.text === ' • ' || run.text?.trim() === '•') {
        runGroups.push([]);
      } else {
        runGroups[runGroups.length - 1].push(run);
      }
    }

    const TYPE_LABELS = new Set(['song', 'video', 'artist', 'album', 'playlist', 'single', 'ep', 'station', 'profile', 'podcast', 'show']);
    let cleanedGroups = runGroups;
    const firstGroupFirstRun = runGroups[0]?.[0];
    if (firstGroupFirstRun) {
      const firstRunText = firstGroupFirstRun.text.trim().toLowerCase();
      if (TYPE_LABELS.has(firstRunText)) {
        cleanedGroups = runGroups.slice(1);
      }
    }

    const pageType = renderer.onTap?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
    const isArtist = pageType === 'MUSIC_PAGE_TYPE_ARTIST' || pageType === 'MUSIC_PAGE_TYPE_LIBRARY_ARTIST';
    const isAlbum = pageType === 'MUSIC_PAGE_TYPE_ALBUM' || pageType === 'MUSIC_PAGE_TYPE_AUDIOBOOK';
    const isPlaylist = pageType === 'MUSIC_PAGE_TYPE_PLAYLIST';
    const isSong = !isArtist && !isAlbum && !isPlaylist;

    if (filter === 'music_songs' || (filter === 'all' && isSong)) {
      const videoId = renderer.onTap?.watchEndpoint?.videoId;
      if (!videoId) return null;

      const artistRuns = cleanedGroups[0] ?? [];
      const artistName = artistRuns.map((r: any) => r.text).join('') || 'Unknown Artist';
      const artistId = artistRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
      const artistsList: { name: string; id: string }[] = [];
      artistRuns.forEach((r: any) => {
        const aId = r.navigationEndpoint?.browseEndpoint?.browseId;
        const aName = r.text?.trim();
        if (aId && aName) {
          artistsList.push({ name: aName, id: aId });
        }
      });

      const albumRuns = cleanedGroups[1] ?? [];
      const group1Text = albumRuns.map((r: any) => r.text).join('').trim();
      const isDuration = group1Text && /^\d+:\d+(:\d+)?$/.test(group1Text);
      const isViewsOrYear = group1Text && (/^\d+(?:\.\d+)?[KMB]? views$/i.test(group1Text) || /^\d{4}$/.test(group1Text));

      let albumName: string | undefined;
      let albumId: string | undefined;
      if (group1Text && !isDuration && !isViewsOrYear) {
        albumName = group1Text;
        albumId = albumRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
      }

      return {
        type: 'stream',
        url: `watch?v=${videoId}`,
        title,
        uploaderName: artistName,
        artistId,
        artists: artistsList.length > 0 ? artistsList : undefined,
        albumName,
        albumId,
        thumbnail,
        duration: 0,
      };
    }

    if (filter === 'channels' || (filter === 'all' && isArtist)) {
      const channelId = renderer.onTap?.browseEndpoint?.browseId;
      if (!channelId) return null;

      return {
        type: 'channel',
        url: `/channel/${channelId}`,
        name: title,
        thumbnail,
      };
    }

    if (filter === 'playlists' || (filter === 'all' && (isAlbum || isPlaylist))) {
      const playlistId = renderer.onTap?.browseEndpoint?.browseId?.replace(/^VL/, '');
      if (!playlistId) return null;

      const artistRuns = cleanedGroups[0] ?? [];
      const artistName = artistRuns.map((r: any) => r.text).join('') || 'Unknown Artist';

      return {
        type: 'playlist',
        url: `list=${playlistId}`,
        title,
        uploaderName: artistName,
        thumbnail,
      };
    }

    return null;
  }

  private parseResponsiveListItem(renderer: any, filter: string): any {
    // Extract thumbnail
    const thumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
    const thumbnail = thumbs.length ? thumbs[thumbs.length - 1].url : null;

    // Title
    const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
    if (!title) return null;

    // Subtitle/Runs (flexColumns[1])
    const runs = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];
    
    // Split runs by separator " • "
    const runGroups: any[][] = [[]];
    for (const run of runs) {
      if (run.text === ' • ' || run.text?.trim() === '•') {
        runGroups.push([]);
      } else {
        runGroups[runGroups.length - 1].push(run);
      }
    }

    // Clean runGroups to remove type labels (e.g. "Song", "Video") at the beginning
    const TYPE_LABELS = new Set(['song', 'video', 'artist', 'album', 'playlist', 'single', 'ep', 'station', 'profile', 'podcast', 'show']);
    let cleanedGroups = runGroups;
    const firstGroupFirstRun = runGroups[0]?.[0];
    if (firstGroupFirstRun) {
      const firstRunText = firstGroupFirstRun.text.trim().toLowerCase();
      if (TYPE_LABELS.has(firstRunText)) {
        cleanedGroups = runGroups.slice(1);
      }
    }

    // Duration
    let duration: number | null = null;
    const fixedColumnText = renderer.fixedColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
    if (fixedColumnText) {
      duration = this.parseDuration(fixedColumnText);
    }
    if (!duration && runs.length > 0) {
      const lastRunText = runs[runs.length - 1].text;
      if (/^\d+:\d+(:\d+)?$/.test(lastRunText)) {
        duration = this.parseDuration(lastRunText);
      }
    }

    // Determine type
    const pageType = renderer.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
    const isArtist = pageType === 'MUSIC_PAGE_TYPE_ARTIST' || pageType === 'MUSIC_PAGE_TYPE_LIBRARY_ARTIST';
    const isAlbum = pageType === 'MUSIC_PAGE_TYPE_ALBUM' || pageType === 'MUSIC_PAGE_TYPE_AUDIOBOOK';
    const isPlaylist = pageType === 'MUSIC_PAGE_TYPE_PLAYLIST';
    const isSong = !isArtist && !isAlbum && !isPlaylist;

    if (filter === 'music_songs' || (filter === 'all' && isSong)) {
      const videoId = renderer.playlistItemData?.videoId ?? 
                      renderer.navigationEndpoint?.watchEndpoint?.videoId ?? 
                      renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ??
                      renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;
      if (!videoId) return null;

      const artistRuns = cleanedGroups[0] ?? [];
      const artistName = artistRuns.map((r: any) => r.text).join('') || 'Unknown Artist';
      const artistId = artistRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
      const artistsList: { name: string; id: string }[] = [];
      artistRuns.forEach((r: any) => {
        const aId = r.navigationEndpoint?.browseEndpoint?.browseId;
        const aName = r.text?.trim();
        if (aId && aName) {
          artistsList.push({ name: aName, id: aId });
        }
      });

      const albumRuns = cleanedGroups[1] ?? [];
      const group1Text = albumRuns.map((r: any) => r.text).join('').trim();
      const isDuration = group1Text && /^\d+:\d+(:\d+)?$/.test(group1Text);
      const isViewsOrYear = group1Text && (/^\d+(?:\.\d+)?[KMB]? views$/i.test(group1Text) || /^\d{4}$/.test(group1Text));

      let albumName: string | undefined;
      let albumId: string | undefined;
      if (group1Text && !isDuration && !isViewsOrYear) {
        albumName = group1Text;
        albumId = albumRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
      }

      return {
        type: 'stream',
        url: `watch?v=${videoId}`,
        title,
        uploaderName: artistName,
        artistId,
        artists: artistsList.length > 0 ? artistsList : undefined,
        albumName,
        albumId,
        thumbnail,
        duration: duration ?? 0,
      };
    }

    if (filter === 'channels' || (filter === 'all' && isArtist)) {
      const channelId = renderer.navigationEndpoint?.browseEndpoint?.browseId;
      if (!channelId) return null;

      return {
        type: 'channel',
        url: `/channel/${channelId}`,
        name: title,
        thumbnail,
      };
    }

    if (filter === 'playlists' || (filter === 'all' && (isAlbum || isPlaylist))) {
      const playlistId = renderer.navigationEndpoint?.browseEndpoint?.browseId?.replace(/^VL/, '');
      if (!playlistId) return null;

      const artistRuns = cleanedGroups[0] ?? [];
      const artistName = artistRuns.map((r: any) => r.text).join('') || 'Unknown Artist';

      return {
        type: 'playlist',
        url: `list=${playlistId}`,
        title,
        uploaderName: artistName,
        thumbnail,
      };
    }

    return null;
  }

  async search(query: string, filter = 'all'): Promise<any> {
    try {
      let params: string | undefined;
      if (filter === 'music_songs') {
        params = 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D'; // FILTER_SONG
      } else if (filter === 'channels') {
        params = 'EgWKAQIgAWoKEAkQChAFEAMQBA%3D%3D'; // FILTER_ARTIST
      } else if (filter === 'albums') {
        params = 'EgWKAQIYAWoKEAkQChAFEAMQBA%3D%3D'; // FILTER_ALBUM
      } else if (filter === 'playlists') {
        params = 'EgWKAQIoAWoKEAkQChAFEAMQBA%3D%3D'; // FILTER_PLAYLIST
      }

      const data = await postInnerTube('search', { query, params });
      const items: any[] = [];

      const sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ?? [];
      for (const section of sections) {
        // Parse Top Result if present
        const cardShelf = section?.musicCardShelfRenderer ?? section?.itemSectionRenderer?.contents?.find((c: any) => c?.musicCardShelfRenderer)?.musicCardShelfRenderer;
        if (cardShelf) {
          const parsedCard = this.parseCardShelf(cardShelf, filter);
          if (parsedCard) {
            items.push(parsedCard);
          }
        }

        const musicShelf = section?.musicShelfRenderer ?? section?.itemSectionRenderer?.contents?.[0]?.musicShelfRenderer;
        if (musicShelf?.contents) {
          for (const itemWrapper of musicShelf.contents) {
            const renderer = itemWrapper?.musicResponsiveListItemRenderer;
            if (!renderer) continue;

            const parsed = this.parseResponsiveListItem(renderer, filter);
            if (parsed) {
              items.push(parsed);
            }
          }
        }
      }

      return { items };
    } catch (error) {
      console.error('[InnerTube search failed]:', error);
      return { items: [] };
    }
  }

  async getStream(videoId: string): Promise<any> {
    try {
      const data = await postInnerTube('player', { videoId });
      const title = data?.videoDetails?.title ?? '';
      const uploader = data?.videoDetails?.author ?? '';
      const duration = parseInt(data?.videoDetails?.lengthSeconds ?? '0', 10);
      const thumbs = data?.videoDetails?.thumbnail?.thumbnails ?? [];
      const thumbnailUrl = thumbs.length ? thumbs[thumbs.length - 1].url : null;

      const adaptiveFormats = data?.streamingData?.adaptiveFormats ?? [];
      const audioStreams = adaptiveFormats
        .filter((f: any) => f?.mimeType?.includes('audio/'))
        .map((f: any) => ({
          url: f.url ?? null,
          mimeType: f.mimeType,
          bitrate: f.bitrate,
          itag: f.itag,
        }));

      const videoStreams = adaptiveFormats
        .filter((f: any) => f?.mimeType?.includes('video/'))
        .map((f: any) => ({
          url: f.url ?? null,
          mimeType: f.mimeType,
          bitrate: f.bitrate,
          itag: f.itag,
          videoOnly: true,
        }));

      return {
        title,
        uploader,
        duration,
        thumbnailUrl,
        audioStreams,
        videoStreams,
      };
    } catch (error) {
      console.error('[InnerTube getStream failed]:', error);
      throw error;
    }
  }

  async getChannel(channelId: string): Promise<any> {
    try {
      const data = await postInnerTube('browse', { browseId: channelId });
      const immersiveHeader = data?.header?.musicImmersiveHeaderRenderer;
      const visualHeader = data?.header?.musicVisualHeaderRenderer;
      const detailHeader = data?.header?.musicDetailHeaderRenderer;
      const header = immersiveHeader ?? visualHeader ?? detailHeader;

      const name = header?.title?.runs?.[0]?.text ?? 'Unknown Artist';
      
      const thumbs = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? 
                     header?.foregroundThumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
      const avatarUrl = thumbs.length ? thumbs[thumbs.length - 1].url : null;

      const subText = immersiveHeader?.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text ??
                      immersiveHeader?.subscriptionButton?.subscribeButtonRenderer?.subscriberCountWithLinkToChannelText?.runs?.[0]?.text ??
                      detailHeader?.subtitle?.runs?.[0]?.text;

      const sections = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ??
                       data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ?? [];

      const parsedSections: any[] = [];

      for (const section of sections) {
        const shelf = section?.musicShelfRenderer;
        const carousel = section?.musicCarouselShelfRenderer;

        if (shelf) {
          const title = shelf.title?.runs?.[0]?.text ?? '';
          const contents = shelf.contents ?? [];
          const items: any[] = [];

          for (const itemWrapper of contents) {
            const renderer = itemWrapper?.musicResponsiveListItemRenderer;
            if (!renderer) continue;

            const videoId = renderer.playlistItemData?.videoId ??
                            renderer.navigationEndpoint?.watchEndpoint?.videoId ??
                            renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ??
                            renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

            const itemThumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
            const thumbnail = itemThumbs.length ? itemThumbs[itemThumbs.length - 1].url : null;
            const titleName = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ?? 'Unknown';

            // Split subtitle runs
            const subtitleRuns = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];
            const subGroups: any[][] = [[]];
            for (const run of subtitleRuns) {
              if (run.text === ' • ' || run.text?.trim() === '•') {
                subGroups.push([]);
              } else {
                subGroups[subGroups.length - 1].push(run);
              }
            }

            const pageType = renderer.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
            const isArtist = pageType === 'MUSIC_PAGE_TYPE_ARTIST' || pageType === 'MUSIC_PAGE_TYPE_LIBRARY_ARTIST';
            const isAlbum = pageType === 'MUSIC_PAGE_TYPE_ALBUM' || pageType === 'MUSIC_PAGE_TYPE_AUDIOBOOK';
            const isPlaylist = pageType === 'MUSIC_PAGE_TYPE_PLAYLIST';

            if (videoId) {
              const artistRuns = subGroups[0] ?? [];
              const artistName = artistRuns.map((r: any) => r.text).join('') || name;
              const artistId = artistRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
              const artistsList: { name: string; id: string }[] = [];
              artistRuns.forEach((r: any) => {
                const aId = r.navigationEndpoint?.browseEndpoint?.browseId;
                const aName = r.text?.trim();
                if (aId && aName) {
                  artistsList.push({ name: aName, id: aId });
                }
              });
              items.push({
                type: 'song',
                id: videoId,
                title: titleName,
                artist: artistName,
                thumbnail,
                artistId: artistId || channelId,
                artists: artistsList.length > 0 ? artistsList : [{ name: artistName, id: artistId || channelId }],
              });
            } else if (isArtist) {
              const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId;
              if (browseId) {
                items.push({
                  type: 'artist',
                  id: browseId,
                  name: titleName,
                  thumbnail,
                });
              }
            } else if (isAlbum || isPlaylist) {
              const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId?.replace(/^VL/, '');
              if (browseId) {
                const artistRuns = subGroups[0] ?? [];
                const artistName = artistRuns.map((r: any) => r.text).join('') || 'Unknown Artist';
                items.push({
                  type: isAlbum ? 'album' : 'playlist',
                  id: browseId,
                  title: titleName,
                  artist: artistName,
                  thumbnail,
                });
              }
            }
          }

          if (items.length > 0) {
            parsedSections.push({
              title,
              type: 'list',
              items,
            });
          }
        }

        if (carousel) {
          const title = carousel.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text ?? '';
          const contents = carousel.contents ?? [];
          const items: any[] = [];

          for (const content of contents) {
            const twoRow = content.musicTwoRowItemRenderer;
            const listItem = content.musicResponsiveListItemRenderer;

            if (twoRow) {
              const itemThumbs = twoRow.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
              const thumbnail = itemThumbs.length ? itemThumbs[itemThumbs.length - 1].url : null;
              const titleName = twoRow.title?.runs?.[0]?.text ?? 'Unknown';

              const pageType = twoRow.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
              const isArtist = pageType === 'MUSIC_PAGE_TYPE_ARTIST' || pageType === 'MUSIC_PAGE_TYPE_LIBRARY_ARTIST';
              const isAlbum = pageType === 'MUSIC_PAGE_TYPE_ALBUM' || pageType === 'MUSIC_PAGE_TYPE_AUDIOBOOK';
              const isPlaylist = pageType === 'MUSIC_PAGE_TYPE_PLAYLIST';
              const videoId = twoRow.navigationEndpoint?.watchEndpoint?.videoId;

              if (videoId) {
                const artistName = twoRow.subtitle?.runs?.[0]?.text ?? '';
                const artistId = twoRow.subtitle?.runs?.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
                const artistsList: { name: string; id: string }[] = [];
                twoRow.subtitle?.runs?.forEach((r: any) => {
                  const aId = r.navigationEndpoint?.browseEndpoint?.browseId;
                  const aName = r.text?.trim();
                  if (aId && aName) {
                    artistsList.push({ name: aName, id: aId });
                  }
                });
                items.push({
                  type: 'song',
                  id: videoId,
                  title: titleName,
                  artist: artistName,
                  thumbnail,
                  artistId: artistId || channelId,
                  artists: artistsList.length > 0 ? artistsList : [{ name: artistName, id: artistId || channelId }],
                });
              } else if (isArtist) {
                const browseId = twoRow.navigationEndpoint?.browseEndpoint?.browseId;
                if (browseId) {
                  items.push({
                    type: 'artist',
                    id: browseId,
                    name: titleName,
                    thumbnail,
                  });
                }
              } else if (isAlbum || isPlaylist) {
                const browseId = twoRow.navigationEndpoint?.browseEndpoint?.browseId?.replace(/^VL/, '');
                if (browseId) {
                  const runs = twoRow.subtitle?.runs ?? [];
                  const year = runs[runs.length - 1]?.text ?? '';
                  items.push({
                    type: isAlbum ? 'album' : 'playlist',
                    id: browseId,
                    title: titleName,
                    artist: runs[0]?.text ?? '',
                    thumbnail,
                    year: /^\d+$/.test(year) ? year : '',
                  });
                }
              }
            } else if (listItem) {
              const videoId = listItem.playlistItemData?.videoId ??
                              listItem.navigationEndpoint?.watchEndpoint?.videoId;
              if (videoId) {
                const titleName = listItem.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ?? 'Unknown';
                const itemThumbs = listItem.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
                const thumbnail = itemThumbs.length ? itemThumbs[itemThumbs.length - 1].url : null;
                const artistName = listItem.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text ?? '';
                const runs = listItem.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];
                const artistId = runs.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
                const artistsList: { name: string; id: string }[] = [];
                runs.forEach((r: any) => {
                  const aId = r.navigationEndpoint?.browseEndpoint?.browseId;
                  const aName = r.text?.trim();
                  if (aId && aName) {
                    artistsList.push({ name: aName, id: aId });
                  }
                });

                items.push({
                  type: 'song',
                  id: videoId,
                  title: titleName,
                  artist: artistName,
                  thumbnail,
                  artistId: artistId || channelId,
                  artists: artistsList.length > 0 ? artistsList : [{ name: artistName, id: artistId || channelId }],
                });
              }
            }
          }

          if (items.length > 0) {
            parsedSections.push({
              title,
              type: 'carousel',
              items,
            });
          }
        }

        const descriptionShelf = section?.musicDescriptionShelfRenderer;
        if (descriptionShelf) {
          const title = 'About';
          const descriptionText = descriptionShelf.description?.runs?.map((r: any) => r.text).join('') ?? 
                                  descriptionShelf.description?.simpleText ?? '';
          const viewCount = descriptionShelf.subheader?.runs?.map((r: any) => r.text).join('') ?? 
                            descriptionShelf.subheader?.simpleText ?? '';

          if (descriptionText) {
            parsedSections.push({
              title,
              type: 'about',
              items: [{
                description: descriptionText,
                views: viewCount || undefined
              }]
            });
          }
        }
      }

      // Fallback search if no shelves parsed
      if (parsedSections.length === 0) {
        try {
          const search = await this.search(name, "music_songs");
          const items: any[] = [];
          for (const item of search.items ?? []) {
            const videoId = item.url.split("v=")[1] || item.url.split("/").pop();
            if (videoId) {
              items.push({
                type: 'song',
                id: videoId,
                title: item.title,
                artist: item.uploaderName || name,
                thumbnail: item.thumbnail,
              });
            }
          }
          if (items.length > 0) {
            parsedSections.push({
              title: 'Popular Songs',
              type: 'list',
              items,
            });
          }
        } catch (err) {
          console.warn('[getChannel fallback search failed]:', err);
        }
      }

      return {
        name,
        avatarUrl,
        subscriberCount: subText ?? undefined,
        sections: parsedSections,
      };
    } catch (error) {
      console.error('[InnerTube getChannel failed]:', error);
      throw error;
    }
  }

  async getPlaylist(playlistId: string): Promise<any> {
    try {
      let browseId = playlistId;
      if (!playlistId.startsWith('VL') && !playlistId.startsWith('MPREb_') && !playlistId.startsWith('FE') && !playlistId.startsWith('UC')) {
        browseId = `VL${playlistId}`;
      }
      const data = await postInnerTube('browse', { browseId });

      const header = findRenderer(data, 'musicResponsiveHeaderRenderer') ??
                     findRenderer(data, 'musicDetailHeaderRenderer') ??
                     findRenderer(data, 'musicEditablePlaylistDetailHeaderRenderer');
      const name = header?.title?.runs?.[0]?.text ?? 'Unknown Playlist';

      let uploader = 'Unknown Artist';
      let artistId: string | undefined;
      if (header?.straplineTextOne?.runs) {
        uploader = header.straplineTextOne.runs.map((r: any) => r.text).join('') || uploader;
        artistId = header.straplineTextOne.runs.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
      } else if (header?.subtitle?.runs) {
        const subRuns = header.subtitle.runs;
        const subGroups: any[][] = [[]];
        for (const run of subRuns) {
          if (run.text === ' • ' || run.text?.trim() === '•') {
            subGroups.push([]);
          } else {
            subGroups[subGroups.length - 1].push(run);
          }
        }
        // For album detail header: "Album • Sabrina Carpenter • 2024" => index 1 is artist
        const artistGroup = subGroups[1] ?? subGroups[0] ?? [];
        uploader = artistGroup.map((r: any) => r.text).join('') || uploader;
        artistId = artistGroup.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
      }

      let thumbs: any[] = [];
      const thumbnailObj = header?.thumbnail;
      if (thumbnailObj) {
        thumbs = thumbnailObj.musicThumbnailRenderer?.thumbnail?.thumbnails ??
                 thumbnailObj.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ??
                 thumbnailObj.thumbnails ?? [];
      }
      const thumbnailUrl = thumbs.length ? thumbs[thumbs.length - 1].url : null;

      const shelf = findRenderer(data, 'musicPlaylistShelfRenderer') ?? findRenderer(data, 'musicShelfRenderer');
      const contents = shelf?.contents ?? [];

      const relatedStreams: any[] = [];
      for (const item of contents) {
        const renderer = item?.musicResponsiveListItemRenderer;
        if (!renderer) continue;

        const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        if (!title) continue;

        const videoId = renderer.playlistItemData?.videoId ?? 
                        renderer.navigationEndpoint?.watchEndpoint?.videoId ??
                        renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
        if (!videoId) continue;

        // Duration
        let duration = 0;
        const fixedColumnText = renderer.fixedColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
        if (fixedColumnText) {
          const parsed = this.parseDuration(fixedColumnText);
          if (parsed !== null) duration = parsed;
        } else {
          const runs = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];
          if (runs.length > 0) {
            const lastRunText = runs[runs.length - 1].text;
            if (/^\d+:\d+(:\d+)?$/.test(lastRunText)) {
              const parsed = this.parseDuration(lastRunText);
              if (parsed !== null) duration = parsed;
            }
          }
        }

        relatedStreams.push({
          url: `watch?v=${videoId}`,
          title,
          duration,
        });
      }

      return {
        name,
        uploader,
        artistId,
        thumbnailUrl,
        relatedStreams,
        videos: relatedStreams.length,
      };
    } catch (error) {
      console.error('[InnerTube getPlaylist failed]:', error);
      throw error;
    }
  }

  // Mocked/Legacy playlist management sub-object (ViTune compatibility)
  readonly playlist = {
    list: async (session: PipedSession): Promise<PipedPlaylistPreview[]> => [],
    create: async (session: PipedSession, name: string): Promise<any> => ({}),
    rename: async (session: PipedSession, playlistId: string, newName: string): Promise<boolean> => true,
    delete: async (session: PipedSession, playlistId: string): Promise<boolean> => true,
    add: async (session: PipedSession, playlistId: string, videoIds: string[]): Promise<boolean> => true,
    remove: async (session: PipedSession, playlistId: string, index: number): Promise<boolean> => true,
    songs: async (session: PipedSession, playlistId: string): Promise<PipedPlaylist> => ({
      name: '',
      thumbnailUrl: '',
      uploader: '',
      videos: 0,
      relatedStreams: [],
    }),
  };

  async login(apiBaseUrl: string, username: string, password: string): Promise<PipedSession> {
    return { apiBaseUrl, token: '' };
  }

  async refreshInstances() {
    // No-op (no Piped instances to refresh)
  }
}

export const pipedService = new PipedService();
