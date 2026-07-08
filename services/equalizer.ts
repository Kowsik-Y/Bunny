import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef } from 'react';
import EqualizerModule from '@/modules/equalizer';
import { useCurrentTrack } from './setup/hooks';

export interface EqualizerBands {
  bandsCount: number;
  minLevel: number;
  maxLevel: number;
  frequencies: number[]; // center frequencies in Hz
}

export const PRESETS = {
  Flat: { name: 'Flat', levels: [0, 0, 0, 0, 0], bass: 0 },
  BassBooster: { name: 'Bass Booster', levels: [500, 300, 0, 0, 0], bass: 800 },
  VocalBooster: { name: 'Vocal Booster', levels: [-200, 0, 200, 400, 100], bass: 0 },
  Electronic: { name: 'Electronic', levels: [400, 200, 0, 200, 400], bass: 300 },
  Pop: { name: 'Pop', levels: [-100, 200, 400, 200, -100], bass: 200 },
};

export function useEqualizer() {
  const currentTrack = useCurrentTrack();
  const [isSupported] = useState(Platform.OS === 'android' && !!EqualizerModule);
  const [isEnabled, setIsEnabled] = useState(false);
  const [bassStrength, setBassStrength] = useState(0);
  const [bandLevels, setBandLevels] = useState<number[]>([0, 0, 0, 0, 0]);
  const [bandsInfo, setBandsInfo] = useState<EqualizerBands | null>(null);
  const [activePreset, setActivePreset] = useState<string>('Flat');

  const nativeBassBoostRef = useRef<number>(0);
  const nativeBandLevelsRef = useRef<number[]>([0, 0, 0, 0, 0]);
  const throttleTimers = useRef<Record<string, any>>({});

  // Load settings on startup
  useEffect(() => {
    if (!isSupported) return;

    const loadSettings = async () => {
      try {
        const enabledVal = await AsyncStorage.getItem('@equalizer_enabled');
        const bassVal = await AsyncStorage.getItem('@equalizer_bass');
        const levelsVal = await AsyncStorage.getItem('@equalizer_levels');
        const presetVal = await AsyncStorage.getItem('@equalizer_preset');

        try {
          const bands: EqualizerBands = await EqualizerModule.getBands();
          setBandsInfo(bands);
        } catch (e) {
          console.warn('[Equalizer] Failed to get bands info', e);
        }

        const isEqEnabled = enabledVal === 'true';
        setIsEnabled(isEqEnabled);

        const savedBass = bassVal ? parseInt(bassVal, 10) : 0;
        setBassStrength(savedBass);
        nativeBassBoostRef.current = savedBass;

        const savedLevels = levelsVal ? JSON.parse(levelsVal) : [0, 0, 0, 0, 0];
        setBandLevels(savedLevels);
        nativeBandLevelsRef.current = savedLevels;

        const savedPreset = presetVal || 'Flat';
        setActivePreset(savedPreset);

        // Apply config to native layer
        await EqualizerModule.setEnabled(isEqEnabled);
        await EqualizerModule.setBassBoost(savedBass);
        for (let i = 0; i < savedLevels.length; i++) {
          await EqualizerModule.setBandLevel(i, savedLevels[i]);
        }
      } catch (err) {
        console.warn('[Equalizer] Failed to load equalizer settings', err);
      }
    };

    loadSettings();
  }, [isSupported]);

  // Re-initialize and apply EQ settings when active track changes
  useEffect(() => {
    if (!isSupported || !currentTrack) return;

    const syncOnTrackChange = async () => {
      try {
        await EqualizerModule.initializeEqualizer();
        await EqualizerModule.setEnabled(isEnabled);
        await EqualizerModule.setBassBoost(bassStrength);
        for (let i = 0; i < bandLevels.length; i++) {
          await EqualizerModule.setBandLevel(i, bandLevels[i]);
        }
      } catch (e) {
        console.warn('[Equalizer] Failed to sync on track change', e);
      }
    };

    syncOnTrackChange();
  }, [currentTrack, isSupported]);

  const toggleEqualizer = async (enabled: boolean) => {
    if (!isSupported) return;
    try {
      await EqualizerModule.setEnabled(enabled);
      setIsEnabled(enabled);
      await AsyncStorage.setItem('@equalizer_enabled', String(enabled));
    } catch (e) {
      console.warn('[Equalizer] Error toggling equalizer', e);
    }
  };

  const updateBassBoost = async (strength: number) => {
    setBassStrength(strength);
    setActivePreset('Custom');
    nativeBassBoostRef.current = strength;

    if (!isSupported) return;

    if (!throttleTimers.current['bass']) {
      throttleTimers.current['bass'] = setTimeout(async () => {
        throttleTimers.current['bass'] = null;
        try {
          await EqualizerModule.setBassBoost(nativeBassBoostRef.current);
          await AsyncStorage.setItem('@equalizer_bass', String(nativeBassBoostRef.current));
          await AsyncStorage.setItem('@equalizer_preset', 'Custom');
        } catch (e) {
          console.warn('[Equalizer] Error setting bass boost', e);
        }
      }, 100);
    }
  };

  const updateBandLevel = async (bandIndex: number, level: number) => {
    const newLevels = [...bandLevels];
    newLevels[bandIndex] = level;
    setBandLevels(newLevels);
    setActivePreset('Custom');
    nativeBandLevelsRef.current = newLevels;

    if (!isSupported) return;

    const timerKey = `band_${bandIndex}`;
    if (!throttleTimers.current[timerKey]) {
      throttleTimers.current[timerKey] = setTimeout(async () => {
        throttleTimers.current[timerKey] = null;
        try {
          const currentLevel = nativeBandLevelsRef.current[bandIndex];
          await EqualizerModule.setBandLevel(bandIndex, currentLevel);
          await AsyncStorage.setItem('@equalizer_levels', JSON.stringify(nativeBandLevelsRef.current));
          await AsyncStorage.setItem('@equalizer_preset', 'Custom');
        } catch (e) {
          console.warn('[Equalizer] Error setting band level', e);
        }
      }, 100);
    }
  };

  const applyPreset = async (presetName: keyof typeof PRESETS | 'Custom') => {
    if (!isSupported) return;
    if (presetName === 'Custom') {
      setActivePreset('Custom');
      await AsyncStorage.setItem('@equalizer_preset', 'Custom');
      return;
    }
    const preset = PRESETS[presetName];
    if (!preset) return;

    try {
      setActivePreset(presetName);
      setBassStrength(preset.bass);
      nativeBassBoostRef.current = preset.bass;
      setBandLevels(preset.levels);
      nativeBandLevelsRef.current = preset.levels;

      await EqualizerModule.setBassBoost(preset.bass);
      for (let i = 0; i < preset.levels.length; i++) {
        await EqualizerModule.setBandLevel(i, preset.levels[i]);
      }

      await AsyncStorage.setItem('@equalizer_bass', String(preset.bass));
      await AsyncStorage.setItem('@equalizer_levels', JSON.stringify(preset.levels));
      await AsyncStorage.setItem('@equalizer_preset', presetName);
    } catch (e) {
      console.warn('[Equalizer] Error applying preset', e);
    }
  };

  return {
    isSupported,
    isEnabled,
    bassStrength,
    bandLevels,
    bandsInfo,
    activePreset,
    toggleEqualizer,
    updateBassBoost,
    updateBandLevel,
    applyPreset,
  };
}
