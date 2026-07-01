import { NativeModule, requireNativeModule } from 'expo';

declare class YoutubeExtractorModule extends NativeModule {
  deobfuscateUrl(videoId: string, streamUrl: string | null, signatureCipher: string | null): Promise<string | null>;
}

export default requireNativeModule<YoutubeExtractorModule>('YoutubeExtractor');
