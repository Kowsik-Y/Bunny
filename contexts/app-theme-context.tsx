import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

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
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

const STORAGE_KEY = 'app-theme-preferences';

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const rawSystemScheme = useSystemColorScheme();
  const systemScheme: 'light' | 'dark' = rawSystemScheme === 'dark' ? 'dark' : 'light';
  const [mode, setMode] = useState<ThemeMode>('system');
  const [variant, setVariant] = useState<ThemeVariantName>('Neutral');
  const [font, setFont] = useState<ThemeFontName>('sans');
  const [audioQuality, setAudioQuality] = useState<AudioQuality>('medium');
  const [playerStyle, setPlayerStyle] = useState<PlayerStyle>('flat');
  const [lyricsSize, setLyricsSize] = useState<LyricsSize>('medium');
  const [lyricsSpacing, setLyricsSpacing] = useState<LyricsSpacing>('regular');
  const [preResolveLimit, setPreResolveLimit] = useState<number>(2);
  const [lyricsPrefetch, setLyricsPrefetch] = useState<boolean>(true);
  const [maxCacheSize, setMaxCacheSize] = useState<number>(2048); // 2GB default
  const [autoClearCache, setAutoClearCache] = useState<boolean>(true);
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
            setLyricsPrefetch(true);
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
        }
      } catch {
        // Ignore and fallback to defaults.
      } finally {
        setHasHydrated(true);
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

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
      })
    ).catch(() => undefined);
  }, [mode, variant, font, audioQuality, playerStyle, lyricsSize, lyricsSpacing, preResolveLimit, lyricsPrefetch, maxCacheSize, autoClearCache, hasHydrated]);

  return <AppThemeContext.Provider value={value} >{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }

  return context;
}
