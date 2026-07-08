export function parseDuration(timeStr: string): number | null {
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

export function parseCardShelf(renderer: any, filter: string): any {
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

    const isExplicit = renderer.badges?.some(
      (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
    ) || renderer.subtitleBadges?.some(
      (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
    ) || false;

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
      explicit: isExplicit,
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

export function parseResponsiveListItem(renderer: any, filter: string): any {
  const thumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ?? [];
  const thumbnail = thumbs.length ? thumbs[thumbs.length - 1].url : null;

  const title = renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
  if (!title) return null;

  const runs = renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs ?? [];
  
  const runGroups: any[][] = [[]];
  for (const run of runs) {
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

  let duration: number | null = null;
  const fixedColumnText = renderer.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text ??
                          renderer.fixedColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
  if (fixedColumnText) {
    duration = parseDuration(fixedColumnText);
  }
  if (!duration && runs.length > 0) {
    const lastRunText = runs[runs.length - 1].text;
    if (/^\d+:\d+(:\d+)?$/.test(lastRunText)) {
      duration = parseDuration(lastRunText);
    }
  }

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

    const isExplicit = renderer.badges?.some(
      (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
    ) || renderer.subtitleBadges?.some(
      (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
    ) || false;

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
      explicit: isExplicit,
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
