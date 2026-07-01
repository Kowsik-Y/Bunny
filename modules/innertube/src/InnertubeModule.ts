import { NativeModule, requireNativeModule } from 'expo';

declare class InnertubeModule extends NativeModule {
  searchSuggestions(query: string): Promise<string>;
  searchSummary(query: string): Promise<string>;
  search(query: string, filter: string): Promise<string>;
  album(browseId: string): Promise<string>;
  artist(browseId: string): Promise<string>;
  playlist(playlistId: string): Promise<string>;
  lyrics(browseId: string): Promise<string | null>;
  player(videoId: string): Promise<string>;
  showDownloadProgressNotification(notificationId: string, title: string, progress: number, totalSongs: number, currentSongIndex: number): Promise<void>;
  showDownloadCompleteNotification(notificationId: string, title: string): Promise<void>;
  showDownloadCancelledNotification(notificationId: string): Promise<void>;
  showDownloadPausedNotification(notificationId: string, title: string): Promise<void>;
  showDownloadFailedNotification(notificationId: string, title: string, reason: string): Promise<void>;
}

const nativeModule = requireNativeModule<InnertubeModule>('Innertube');

// Helper to parse JSON string results from native module
export default {
  async searchSuggestions(query: string) {
    const res = await nativeModule.searchSuggestions(query);
    return JSON.parse(res);
  },
  async searchSummary(query: string) {
    const res = await nativeModule.searchSummary(query);
    return JSON.parse(res);
  },
  async search(query: string, filter: string) {
    const res = await nativeModule.search(query, filter);
    return JSON.parse(res);
  },
  async album(browseId: string) {
    const res = await nativeModule.album(browseId);
    return JSON.parse(res);
  },
  async artist(browseId: string) {
    const res = await nativeModule.artist(browseId);
    return JSON.parse(res);
  },
  async playlist(playlistId: string) {
    const res = await nativeModule.playlist(playlistId);
    return JSON.parse(res);
  },
  async lyrics(browseId: string) {
    return await nativeModule.lyrics(browseId);
  },
  async player(videoId: string) {
    const res = await nativeModule.player(videoId);
    return JSON.parse(res);
  },
  async showDownloadProgressNotification(notificationId: string, title: string, progress: number, totalSongs: number, currentSongIndex: number) {
    await nativeModule.showDownloadProgressNotification(notificationId, title, progress, totalSongs, currentSongIndex);
  },
  async showDownloadCompleteNotification(notificationId: string, title: string) {
    await nativeModule.showDownloadCompleteNotification(notificationId, title);
  },
  async showDownloadCancelledNotification(notificationId: string) {
    await nativeModule.showDownloadCancelledNotification(notificationId);
  },
  async showDownloadPausedNotification(notificationId: string, title: string) {
    await nativeModule.showDownloadPausedNotification(notificationId, title);
  },
  async showDownloadFailedNotification(notificationId: string, title: string, reason: string) {
    await nativeModule.showDownloadFailedNotification(notificationId, title, reason);
  }
};
