import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import EqualizerModule from '../modules/equalizer';
import TrackPlayer, { Event } from 'react-native-track-player';

import {
  getThemeColors,
  type ThemeColors,
  getFontFamilies,
  type ThemeMode,
  type ThemeFontName,
  type ThemeVariantName,
  ThemeVariantOptions,
} from '@/constants/theme';

export type AudioQuality = 'low' | 'medium' | 'high';
export type PlayerStyle = 'flat' | 'solid';
export type LyricsSize = 'small' | 'medium' | 'large';
export type LyricsSpacing = 'compact' | 'regular' | 'spacious';

type AppThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  variant: ThemeVariantName;
  setVariant: (variant: ThemeVariantName) => void;
  colorScheme: Exclude<ThemeMode, 'system'>;
  colors: ThemeColors;
  font: ThemeFontName;
  setFont: (font: ThemeFontName) => void;
  fontFamily: string;
  headingFontFamily: string;
  semiBoldFontFamily: string;
  audioQuality: AudioQuality;
  setAudioQuality: (quality: AudioQuality) => void;
  playerStyle: PlayerStyle;
  setPlayerStyle: (style: PlayerStyle) => void;
  lyricsSize: LyricsSize;
  setLyricsSize: (size: LyricsSize) => void;
  lyricsSpacing: LyricsSpacing;
  setLyricsSpacing: (spacing: LyricsSpacing) => void;
  preResolveLimit: number;
  setPreResolveLimit: (limit: number) => void;
  lyricsPrefetch: boolean;
  setLyricsPrefetch: (enabled: boolean) => void;
  maxCacheSize: number;
  setMaxCacheSize: (size: number) => void;
  autoClearCache: boolean;
  setAutoClearCache: (enabled: boolean) => void;
  explicitContentEnabled: boolean;
  setExplicitContentEnabled: (enabled: boolean) => void;
  recommendationLanguages: string[];
  setRecommendationLanguages: (languages: string[]) => void;
  updateNotificationsEnabled: boolean;
  setUpdateNotificationsEnabled: (enabled: boolean) => void;
  downloadNotificationsEnabled: boolean;
  setDownloadNotificationsEnabled: (enabled: boolean) => void;
  downloadQuality: 'low' | 'medium' | 'high';
  setDownloadQuality: (quality: 'low' | 'medium' | 'high') => void;
  skipSilenceEnabled: boolean;
  setSkipSilenceEnabled: (enabled: boolean) => void;
  crossfadeEnabled: boolean;
  setCrossfadeEnabled: (enabled: boolean) => void;
  crossfadeDuration: number;
  setCrossfadeDuration: (duration: number) => void;
  equalizerEnabled: boolean;
  setEqualizerEnabled: (enabled: boolean) => void;
  equalizerBassBoost: number;
  setEqualizerBassBoost: (boost: number) => void;
  equalizerBandLevels: number[];
  setEqualizerBandLevels: (levels: number[]) => void;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

const STORAGE_KEY = 'app-theme-preferences';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const rawSystemScheme = useSystemColorScheme();
  const systemScheme: 'light' | 'dark' = rawSystemScheme === 'dark' ? 'dark' : 'light';
  const [mode, setMode] = useState<ThemeMode>('system');
  const [variant, setVariant] = useState<ThemeVariantName>('Neutral');
  const [font, setFont] = useState<ThemeFontName>('nunito');
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('medium');
  const [playerStyle, setPlayerStyle] = useState<PlayerStyle>('flat');
  const [lyricsSize, setLyricsSize] = useState<LyricsSize>('medium');
  const [lyricsSpacing, setLyricsSpacing] = useState<LyricsSpacing>('regular');
  const [preResolveLimit, setPreResolveLimit] = useState<number>(2);
  const [lyricsPrefetch, setLyricsPrefetch] = useState<boolean>(false);
  const [maxCacheSize, setMaxCacheSize] = useState<number>(2048); // 2GB default
  const [autoClearCache, setAutoClearCache] = useState<boolean>(true);
  const [explicitContentEnabled, setExplicitContentEnabled] = useState<boolean>(true);
  const [recommendationLanguages, setRecommendationLanguages] = useState<string[]>([]);
  const [updateNotificationsEnabled, setUpdateNotificationsEnabled] = useState<boolean>(true);
  const [downloadNotificationsEnabled, setDownloadNotificationsEnabled] = useState<boolean>(true);
  const [downloadQuality, setDownloadQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [skipSilenceEnabled, setSkipSilenceEnabled] = useState<boolean>(false);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState<boolean>(false);
  const [crossfadeDuration, setCrossfadeDuration] = useState<number>(3);
  const [equalizerEnabled, setEqualizerEnabled] = useState<boolean>(false);
  const [equalizerBassBoost, setEqualizerBassBoost] = useState<number>(0);
  const [equalizerBandLevels, setEqualizerBandLevels] = useState<number[]>([0, 0, 0, 0, 0]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const colorScheme = mode === 'system' ? systemScheme : mode;
  const colors = useMemo(() => getThemeColors(variant, colorScheme), [variant, colorScheme]);
  const fontFamilies = useMemo(() => getFontFamilies(font), [font]);
  const fontFamily = fontFamilies.body;
  const headingFontFamily = fontFamilies.heading;
  const semiBoldFontFamily = fontFamilies.semiBold;
  
  const value = useMemo(
    () => ({
      mode,
      setMode,
      variant,
      setVariant,
      colorScheme,
      colors,
      font,
      setFont,
      fontFamily,
      headingFontFamily,
      semiBoldFontFamily,
      audioQuality,
      setAudioQuality,
      playerStyle,
      setPlayerStyle,
      lyricsSize,
      setLyricsSize,
      lyricsSpacing,
      setLyricsSpacing,
      preResolveLimit,
      setPreResolveLimit,
      lyricsPrefetch,
      setLyricsPrefetch,
      maxCacheSize,
      setMaxCacheSize,
      autoClearCache,
      setAutoClearCache,
      explicitContentEnabled,
      setExplicitContentEnabled,
      recommendationLanguages,
      setRecommendationLanguages,
      updateNotificationsEnabled,
      setUpdateNotificationsEnabled,
      downloadNotificationsEnabled,
      setDownloadNotificationsEnabled,
      downloadQuality,
      setDownloadQuality,
      skipSilenceEnabled,
      setSkipSilenceEnabled,
      crossfadeEnabled,
      setCrossfadeEnabled,
      crossfadeDuration,
      setCrossfadeDuration,
      equalizerEnabled,
      setEqualizerEnabled,
      equalizerBassBoost,
      setEqualizerBassBoost,
      equalizerBandLevels,
      setEqualizerBandLevels,
    }),
    [
      mode,
      variant,
      colorScheme,
      colors,
      font,
      fontFamily,
      headingFontFamily,
      semiBoldFontFamily,
      audioQuality,
      playerStyle,
      lyricsSize,
      lyricsSpacing,
      preResolveLimit,
      lyricsPrefetch,
      maxCacheSize,
      autoClearCache,
      explicitContentEnabled,
      recommendationLanguages,
      updateNotificationsEnabled,
      downloadNotificationsEnabled,
      downloadQuality,
      skipSilenceEnabled,
      crossfadeEnabled,
      crossfadeDuration,
      equalizerEnabled,
      equalizerBassBoost,
      equalizerBandLevels,
    ]
  );

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            mode?: ThemeMode;
            variant?: ThemeVariantName;
            font?: ThemeFontName;
            audioQuality?: AudioQuality;
            playerStyle?: PlayerStyle;
            lyricsSize?: LyricsSize;
            lyricsSpacing?: LyricsSpacing;
            preResolveLimit?: number;
            lyricsPrefetch?: boolean;
            maxCacheSize?: number;
            autoClearCache?: boolean;
            explicitContentEnabled?: boolean;
            recommendationLanguages?: string[];
            updateNotificationsEnabled?: boolean;
            downloadNotificationsEnabled?: boolean;
            downloadQuality?: 'low' | 'medium' | 'high';
            skipSilenceEnabled?: boolean;
            crossfadeEnabled?: boolean;
            crossfadeDuration?: number;
            equalizerEnabled?: boolean;
            equalizerBassBoost?: number;
            equalizerBandLevels?: number[];
          };
          if (parsed.mode === 'light' || parsed.mode === 'dark' || parsed.mode === 'system') {
            setMode(parsed.mode);
          }
          if (parsed.variant && ThemeVariantOptions.includes(parsed.variant)) {
            setVariant(parsed.variant);
          }
          if (
            parsed.font === 'sans' ||
            parsed.font === 'serif' ||
            parsed.font === 'rounded' ||
            parsed.font === 'mono' ||
            parsed.font === 'poppins' ||
            parsed.font === 'nunito' ||
            parsed.font === 'combo'
          ) {
            setFont(parsed.font);
          }
          if (parsed.audioQuality === 'low' || parsed.audioQuality === 'medium' || parsed.audioQuality === 'high') {
            setAudioQuality(parsed.audioQuality);
          }
          if (parsed.playerStyle === 'flat' || parsed.playerStyle === 'solid') {
            setPlayerStyle(parsed.playerStyle);
          } else {
            setPlayerStyle('flat');
          }
          if (parsed.lyricsSize === 'small' || parsed.lyricsSize === 'medium' || parsed.lyricsSize === 'large') {
            setLyricsSize(parsed.lyricsSize);
          }
          if (parsed.lyricsSpacing === 'compact' || parsed.lyricsSpacing === 'regular' || parsed.lyricsSpacing === 'spacious') {
            setLyricsSpacing(parsed.lyricsSpacing);
          }
          if (typeof parsed.preResolveLimit === 'number') {
            setPreResolveLimit(parsed.preResolveLimit);
          } else {
            setPreResolveLimit(2);
          }
          if (typeof parsed.lyricsPrefetch === 'boolean') {
            setLyricsPrefetch(parsed.lyricsPrefetch);
          } else {
            setLyricsPrefetch(false);
          }
          if (typeof parsed.maxCacheSize === 'number') {
            setMaxCacheSize(parsed.maxCacheSize);
          } else {
            setMaxCacheSize(2048);
          }
          if (typeof parsed.autoClearCache === 'boolean') {
            setAutoClearCache(parsed.autoClearCache);
          } else {
            setAutoClearCache(true);
          }
          if (typeof parsed.explicitContentEnabled === 'boolean') {
            setExplicitContentEnabled(parsed.explicitContentEnabled);
          } else {
            setExplicitContentEnabled(true);
          }
          if (Array.isArray(parsed.recommendationLanguages)) {
            setRecommendationLanguages(parsed.recommendationLanguages);
          } else {
            setRecommendationLanguages([]);
          }
          if (typeof parsed.updateNotificationsEnabled === 'boolean') {
            setUpdateNotificationsEnabled(parsed.updateNotificationsEnabled);
          } else {
            setUpdateNotificationsEnabled(true);
          }
          if (typeof parsed.downloadNotificationsEnabled === 'boolean') {
            setDownloadNotificationsEnabled(parsed.downloadNotificationsEnabled);
          } else {
            setDownloadNotificationsEnabled(true);
          }
          if (parsed.downloadQuality === 'low' || parsed.downloadQuality === 'medium' || parsed.downloadQuality === 'high') {
            setDownloadQuality(parsed.downloadQuality);
          } else {
            setDownloadQuality('high');
          }
          if (typeof parsed.skipSilenceEnabled === 'boolean') {
            setSkipSilenceEnabled(parsed.skipSilenceEnabled);
          }
          if (typeof parsed.crossfadeEnabled === 'boolean') {
            setCrossfadeEnabled(parsed.crossfadeEnabled);
          }
          if (typeof parsed.crossfadeDuration === 'number') {
            setCrossfadeDuration(parsed.crossfadeDuration);
          }
          if (typeof parsed.equalizerEnabled === 'boolean') {
            setEqualizerEnabled(parsed.equalizerEnabled);
          }
          if (typeof parsed.equalizerBassBoost === 'number') {
            setEqualizerBassBoost(parsed.equalizerBassBoost);
          }
          if (Array.isArray(parsed.equalizerBandLevels)) {
            setEqualizerBandLevels(parsed.equalizerBandLevels);
          }
        }
      } catch {
        // Ignore and fallback to defaults.
      } finally {
        setHasHydrated(true);
      }
    };

    loadPreferences();
  }, []);

  // Refs to avoid unsubscribing and re-subscribing to TrackPlayer events on state change
  const equalizerEnabledRef = useRef(equalizerEnabled);
  const equalizerBassBoostRef = useRef(equalizerBassBoost);
  const equalizerBandLevelsRef = useRef(equalizerBandLevels);
  const prevBandLevelsRef = useRef<number[]>(equalizerBandLevels);

  useEffect(() => {
    equalizerEnabledRef.current = equalizerEnabled;
    equalizerBassBoostRef.current = equalizerBassBoost;
    equalizerBandLevelsRef.current = equalizerBandLevels;
  }, [equalizerEnabled, equalizerBassBoost, equalizerBandLevels]);

  // Debounced storage sync to prevent write bottlenecks during slider drag/knob panning
  useEffect(() => {
    if (!hasHydrated) return;

    const timer = setTimeout(() => {
      AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          mode,
          variant,
          font,
          audioQuality,
          lyricsSize,
          lyricsSpacing,
          preResolveLimit,
          lyricsPrefetch,
          maxCacheSize,
          autoClearCache,
          explicitContentEnabled,
          recommendationLanguages,
          updateNotificationsEnabled,
          downloadNotificationsEnabled,
          downloadQuality,
          skipSilenceEnabled,
          crossfadeEnabled,
          crossfadeDuration,
          equalizerEnabled,
          equalizerBassBoost,
          equalizerBandLevels,
        })
      ).catch(() => undefined);
    }, 1000); // 1s debounce

    return () => clearTimeout(timer);
  }, [
    mode,
    variant,
    font,
    audioQuality,
    playerStyle,
    lyricsSize,
    lyricsSpacing,
    preResolveLimit,
    lyricsPrefetch,
    maxCacheSize,
    autoClearCache,
    explicitContentEnabled,
    recommendationLanguages,
    updateNotificationsEnabled,
    downloadNotificationsEnabled,
    downloadQuality,
    skipSilenceEnabled,
    crossfadeEnabled,
    crossfadeDuration,
    equalizerEnabled,
    equalizerBassBoost,
    equalizerBandLevels,
    hasHydrated,
  ]);

  // Synchronise native equalizer enabled state
  // When disabled: release the native AudioEffect so TrackPlayer is untouched.
  // When enabled: initialize and apply all settings.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!equalizerEnabled) {
      // Release native effects entirely — nothing attached to the audio session
      EqualizerModule.setEnabled(false).catch(() => undefined);
      return;
    }
    // EQ just turned on — initialize and apply saved settings
    const applySettings = async () => {
      try {
        await EqualizerModule.initializeEqualizer();
        await EqualizerModule.setEnabled(true);
        await EqualizerModule.setBassBoost(equalizerBassBoostRef.current);
        const bands = equalizerBandLevelsRef.current;
        for (let i = 0; i < bands.length; i++) {
          await EqualizerModule.setBandLevel(i, bands[i] * 100);
        }
      } catch (err) {
        console.warn('Failed to apply EQ settings on enable:', err);
      }
    };
    applySettings();
  }, [equalizerEnabled, hasHydrated]);

  // Synchronise native bass boost (only when EQ is on)
  useEffect(() => {
    if (!hasHydrated || !equalizerEnabled) return;
    EqualizerModule.setBassBoost(equalizerBassBoost).catch((err: any) =>
      console.warn('Failed to apply EQ bass boost:', err)
    );
  }, [equalizerBassBoost, equalizerEnabled, hasHydrated]);

  // Synchronise native band levels (only when EQ is on)
  useEffect(() => {
    if (!hasHydrated || !equalizerEnabled) {
      prevBandLevelsRef.current = equalizerBandLevels;
      return;
    }
    equalizerBandLevels.forEach((level, index) => {
      if (level !== prevBandLevelsRef.current[index]) {
        EqualizerModule.setBandLevel(index, level * 100).catch((err: any) =>
          console.warn('Failed to apply EQ band level:', err)
        );
      }
    });
    prevBandLevelsRef.current = equalizerBandLevels;
  }, [equalizerBandLevels, equalizerEnabled, hasHydrated]);

  // Re-initialize and sync native equalizer when active track changes or player turns ready
  useEffect(() => {
    if (!hasHydrated) return;

    const syncEqualizerWithRetry = async (retries = 4, delayMs = 200) => {
      // If EQ is disabled, don't touch the bridge at all — let TrackPlayer handle audio normally
      if (!equalizerEnabledRef.current) return;
      try {
        await EqualizerModule.initializeEqualizer();
        await EqualizerModule.setEnabled(true);
        await EqualizerModule.setBassBoost(equalizerBassBoostRef.current);
        const bands = equalizerBandLevelsRef.current;
        for (let i = 0; i < bands.length; i++) {
          await EqualizerModule.setBandLevel(i, bands[i] * 100);
        }
      } catch (_err) {
        if (retries > 0) {
          setTimeout(() => {
            syncEqualizerWithRetry(retries - 1, delayMs * 1.5);
          }, delayMs);
        }
      }
    };

    // Trigger initial sync
    syncEqualizerWithRetry();

    const trackSub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, () => {
      syncEqualizerWithRetry();
    });

    const stateSub = TrackPlayer.addEventListener(Event.PlaybackState, () => {
      syncEqualizerWithRetry();
    });

    return () => {
      trackSub.remove();
      stateSub.remove();
    };
  }, [hasHydrated]);

  // Synchronise native skip silence on state changes
  useEffect(() => {
    if (!hasHydrated) return;
    EqualizerModule.setSkipSilenceEnabled(skipSilenceEnabled).catch((err: any) =>
      console.warn('Failed to apply skip silence state:', err)
    );
  }, [skipSilenceEnabled, hasHydrated]);

  return <AppThemeContext.Provider value={value} >{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
