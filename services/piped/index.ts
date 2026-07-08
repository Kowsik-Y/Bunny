import { PipedSession, PipedPlaylistPreview, PipedPlaylist } from './types';
import { postInnerTube, findRenderer } from './api';
import { parseDuration, parseCardShelf, parseResponsiveListItem } from './parser';

class PipedService {
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
        const cardShelf = section?.musicCardShelfRenderer ?? section?.itemSectionRenderer?.contents?.find((c: any) => c?.musicCardShelfRenderer)?.musicCardShelfRenderer;
        if (cardShelf) {
          const parsedCard = parseCardShelf(cardShelf, filter);
          if (parsedCard) {
            items.push(parsedCard);
          }
        }

        const musicShelf = section?.musicShelfRenderer ?? section?.itemSectionRenderer?.contents?.[0]?.musicShelfRenderer;
        if (musicShelf?.contents) {
          for (const itemWrapper of musicShelf.contents) {
            const renderer = itemWrapper?.musicResponsiveListItemRenderer;
            if (!renderer) continue;

            const parsed = parseResponsiveListItem(renderer, filter);
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
              const isExplicit = renderer.badges?.some(
                (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
              ) || renderer.subtitleBadges?.some(
                (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
              ) || false;
              items.push({
                type: 'song',
                id: videoId,
                title: titleName,
                artist: artistName,
                thumbnail,
                artistId: artistId || channelId,
                artists: artistsList.length > 0 ? artistsList : [{ name: artistName, id: artistId || channelId }],
                explicit: isExplicit,
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
                const isExplicit = twoRow.badges?.some(
                  (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
                ) || twoRow.subtitleBadges?.some(
                  (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
                ) || false;
                items.push({
                  type: 'song',
                  id: videoId,
                  title: titleName,
                  artist: artistName,
                  thumbnail,
                  artistId: artistId || channelId,
                  artists: artistsList.length > 0 ? artistsList : [{ name: artistName, id: artistId || channelId }],
                  explicit: isExplicit,
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

                const isExplicit = listItem.badges?.some(
                  (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
                ) || listItem.subtitleBadges?.some(
                  (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
                ) || false;
                items.push({
                  type: 'song',
                  id: videoId,
                  title: titleName,
                  artist: artistName,
                  thumbnail,
                  artistId: artistId || channelId,
                  artists: artistsList.length > 0 ? artistsList : [{ name: artistName, id: artistId || channelId }],
                  explicit: isExplicit,
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
                artistId: item.artistId || channelId,
                artists: item.artists || [{ name: item.uploaderName || name, id: item.artistId || channelId }],
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

        let duration = 0;
        const lengthText = renderer.lengthText?.runs?.[0]?.text ?? renderer.lengthText?.simpleText;
        if (lengthText) {
          const parsed = parseDuration(lengthText);
          if (parsed !== null) duration = parsed;
        } else {
          const fixedColumnText = renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text ??
                                  renderer.fixedColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
          if (fixedColumnText && fixedColumnText.includes(':')) {
            const parsed = parseDuration(fixedColumnText);
            if (parsed !== null) duration = parsed;
          } else {
            const runs = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];
            if (runs.length > 0) {
              const lastRunText = runs[runs.length - 1].text;
              if (lastRunText && lastRunText.includes(':') && /^\d+:\d+(:\d+)?$/.test(lastRunText)) {
                const parsed = parseDuration(lastRunText);
                if (parsed !== null) duration = parsed;
              }
            }
          }
        }

        // Parse actual artist, album, and other metadata from flexColumns[1]
        let artistName = 'Unknown Artist';
        let artistId: string | undefined;
        let artistsList: { name: string; id: string }[] = [];
        let albumName: string | undefined;
        let albumId: string | undefined;

        const metadataRuns = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];
        if (metadataRuns.length > 0) {
          const groups: any[][] = [[]];
          for (const run of metadataRuns) {
            if (run.text === ' • ' || run.text?.trim() === '•') {
              groups.push([]);
            } else {
              groups[groups.length - 1].push(run);
            }
          }

          const artistRuns = groups[0] ?? [];
          if (artistRuns.length > 0) {
            artistName = artistRuns.map((r: any) => r.text).join('') || 'Unknown Artist';
            artistId = artistRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
            artistRuns.forEach((r: any) => {
              const aId = r.navigationEndpoint?.browseEndpoint?.browseId;
              const aName = r.text?.trim();
              if (aId && aName && aName !== ',') {
                artistsList.push({ name: aName, id: aId });
              }
            });
          }

          const albumRuns = groups[1] ?? [];
          if (albumRuns.length > 0) {
            const group1Text = albumRuns.map((r: any) => r.text).join('').trim();
            const isDuration = group1Text && /^\d+:\d+(:\d+)?$/.test(group1Text);
            const isViewsOrYear = group1Text && (/^\d+(?:\.\d+)?[KMB]? views$/i.test(group1Text) || /^\d{4}$/.test(group1Text));
            if (group1Text && !isDuration && !isViewsOrYear) {
              albumName = group1Text;
              albumId = albumRuns.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
            }
          }
        }

        const isExplicit = renderer.badges?.some(
          (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
        ) || renderer.subtitleBadges?.some(
          (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
        ) || false;

        relatedStreams.push({
          url: `watch?v=${videoId}`,
          title,
          duration,
          uploaderName: artistName,
          artistId,
          artists: artistsList.length > 0 ? artistsList : undefined,
          albumName,
          albumId,
          explicit: isExplicit,
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
  }
}

export const pipedService = new PipedService();
export default pipedService;
