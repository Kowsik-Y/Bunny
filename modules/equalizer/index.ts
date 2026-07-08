import { requireNativeModule } from 'expo';

// Declaring typing interface for Native Equalizer module methods
export interface EqualizerNative {
  initializeEqualizer(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<boolean>;
  getBands(): Promise<{
    bandsCount: number;
    minLevel: number;
    maxLevel: number;
    frequencies: number[];
  }>;
  setBandLevel(band: number, level: number): Promise<boolean>;
  setBassBoost(strength: number): Promise<boolean>;
  setSkipSilenceEnabled(enabled: boolean): Promise<boolean>;
  extractMetadata(uri: string): Promise<{
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
    artwork?: string;
    lrc?: string;
  }>;
}

const EqualizerModule = requireNativeModule<EqualizerNative>('Equalizer');
export default EqualizerModule;
