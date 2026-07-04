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
