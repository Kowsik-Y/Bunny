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
};

export default webModulePlaceholder;
