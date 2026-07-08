export type YtMusicSearchResult = {
  type: 'song' | 'video' | 'artist' | 'album' | 'playlist';
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
  explicit?: boolean;
};

export type CategorizedSearchResults = {
  songs: YtMusicSearchResult[];
  videos: YtMusicSearchResult[];
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
