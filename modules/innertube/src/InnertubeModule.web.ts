import { registerWebModule, NativeModule } from 'expo';

class InnertubeModule extends NativeModule<{}> {}

registerWebModule(InnertubeModule, 'InnertubeModule');

// Export a placeholder matching the mobile interface to ensure cross-platform type compatibility
const webModulePlaceholder = {
  async searchSuggestions(query: string): Promise<any> { return { queries: [], recommendedItems: [] }; },
  async searchSummary(query: string): Promise<any> { return { summaries: [] }; },
  async search(query: string, filter: string): Promise<any> { return { items: [] }; },
  async album(browseId: string): Promise<any> { return null; },
  async artist(browseId: string): Promise<any> { return null; },
  async playlist(playlistId: string): Promise<any> { return null; },
  async lyrics(browseId: string): Promise<any> { return null; },
  async player(videoId: string): Promise<any> { return null; },
  async showDownloadProgressNotification(notificationId: string, title: string, progress: number, totalSongs: number, currentSongIndex: number): Promise<void> {},
  async showDownloadCompleteNotification(notificationId: string, title: string, body: string, artworkUrl?: string): Promise<void> {},
  async showDownloadCancelledNotification(notificationId: string): Promise<void> {},
  async showDownloadPausedNotification(notificationId: string, title: string): Promise<void> {},
  async showDownloadFailedNotification(notificationId: string, title: string, reason: string): Promise<void> {},
};

export default webModulePlaceholder;
