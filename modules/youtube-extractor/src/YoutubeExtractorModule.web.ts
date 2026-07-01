import { registerWebModule, NativeModule } from 'expo';

// YoutubeExtractorModule is not available on the web platform.
class YoutubeExtractorModule extends NativeModule<{}> {}

registerWebModule(YoutubeExtractorModule, 'YoutubeExtractorModule');

// Export a placeholder matching the mobile interface to ensure cross-platform type compatibility
const webModulePlaceholder = {
  async deobfuscateUrl(videoId: string, streamUrl: string | null, signatureCipher: string | null): Promise<string | null> {
    return null;
  }
};

export default webModulePlaceholder;
