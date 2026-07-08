import { Platform } from 'react-native';
import exportedModule from '../../modules/innertube';
import { upgradeThumbQuality } from './utils';

export interface HomeItem {
  type: 'song' | 'album' | 'playlist' | 'artist' | 'video';
  id: string;
  title: string;
  name?: string;
  artist?: string;
  thumbnail?: string;
  duration?: number;
  explicit?: boolean;
  albumId?: string;
  artistId?: string;
  artists?: { name: string; id: string }[];
}

export interface HomeSection {
  title: string;
  items: HomeItem[];
}

export interface HomePageData {
  sections: HomeSection[];
  continuation?: string | null;
}

function mapNativeItem(item: any): HomeItem {
  const artistName =
    item.artists?.map((a: any) => a.name).join(', ') ||
    item.author?.name ||
    item.artist ||
    'Unknown';

  const id = item.id || item.browseId || item.playlistId || '';
  let type: HomeItem['type'] = 'song';

  if (id.startsWith('MPREb') || item.type === 'album') {
    type = 'album';
  } else if (
    item.playlistId ||
    item.songCountText !== undefined ||
    id.startsWith('PL') ||
    id.startsWith('RD') ||
    id.startsWith('VL') ||
    item.type === 'playlist'
  ) {
    type = 'playlist';
  } else if (
    id.startsWith('UC') ||
    item.channelId ||
    item.type === 'artist'
  ) {
    type = 'artist';
  } else if (
    (item.musicVideoType && item.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV') ||
    item.type === 'video'
  ) {
    type = 'video';
  }

  return {
    type,
    id,
    title: item.title || item.name || '',
    name: item.name || item.title || '',
    artist: artistName,
    thumbnail: upgradeThumbQuality(item.thumbnail),
    duration: item.duration,
    explicit: item.explicit || false,
    albumId: item.album?.id || item.browseId,
    artistId: item.artists?.[0]?.id || item.author?.id,
    artists: item.artists?.map((a: any) => ({ name: a.name, id: a.id || '' })),
  };
}

function mapNativeSection(section: any): HomeSection | null {
  const title = section.title || section.label || '';
  if (!title) return null;
  const rawItems: any[] = section.items || [];
  if (rawItems.length === 0) return null;
  const items = rawItems.map(mapNativeItem).filter(i => i.id);
  return { title, items };
}

export async function getHomePage(): Promise<HomePageData> {
  try {
    if (typeof exportedModule.home !== 'function') {
      console.warn('[getHomePage] native home function is not defined. Fallback triggers.');
      return { sections: [], continuation: null };
    }
    const data = await exportedModule.home();
    const sections: HomeSection[] = (data?.sections || [])
      .map(mapNativeSection)
      .filter((s: HomeSection | null): s is HomeSection => s !== null && s.items.length > 0);
    return { sections, continuation: data?.continuation ?? null };
  } catch (e) {
    console.warn('[getHomePage] failed:', e);
    return { sections: [], continuation: null };
  }
}

export async function getHomePageContinuation(token: string): Promise<HomePageData> {
  try {
    if (typeof exportedModule.homeContinuation !== 'function') {
      console.warn('[getHomePageContinuation] native homeContinuation function is not defined.');
      return { sections: [], continuation: null };
    }
    const data = await exportedModule.homeContinuation(token);
    const sections: HomeSection[] = (data?.sections || [])
      .map(mapNativeSection)
      .filter((s: HomeSection | null): s is HomeSection => s !== null && s.items.length > 0);
    return { sections, continuation: data?.continuation ?? null };
  } catch (e) {
    console.warn('[getHomePageContinuation] failed:', e);
    return { sections: [], continuation: null };
  }
}
