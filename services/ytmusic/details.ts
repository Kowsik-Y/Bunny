import { pipedService } from '../piped';

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
        artist: stream.uploaderName || data.uploader || 'Unknown Artist',
        album: stream.albumName || data.name || 'Playlist',
        artwork: data.thumbnailUrl || '',
        duration: stream.duration || 0,
        url: `https://music.youtube.com/watch?v=${videoId}`,
        artistId: stream.artistId || data.artistId,
        albumId: stream.albumId || id,
        artists: stream.artists || (data.artistId ? [{ name: data.uploader || 'Unknown Artist', id: data.artistId }] : undefined),
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
