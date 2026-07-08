import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Text, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Switch } from '@/components/ui/switch';
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Slider } from '@/components/ui/slider';

const { width: screenWidth } = Dimensions.get('window');

type EqualizerTab = 'simple' | 'advanced';

// Presets data definitions
const bunnyPresets = [
  { name: 'Flat', levels: [0, 0, 0, 0, 0], boost: 0 },
  { name: 'Signature', levels: [3, 1, 0, 1, 2], boost: 300 },
  { name: 'Acoustic', levels: [1, 2, 1, 2, 3], boost: 200 },
  { name: 'Bass Boost', levels: [5, 2, 0, -1, -2], boost: 800 },
  { name: 'Pure Clarity', levels: [-2, 0, 2, 3, 5], boost: 0 },
  { name: 'Soft Bass', levels: [4, 2, -1, -2, -2], boost: 500 },
  { name: 'Electronic', levels: [3, 0, 1, 2, 3], boost: 400 },
  { name: 'Rock', levels: [4, 1, -1, 2, 4], boost: 400 },
  { name: 'Pop', levels: [-1, 2, 3, 2, 0], boost: 200 },
  { name: 'Jazz', levels: [2, 1, 1, 1, 2], boost: 300 },
  { name: 'Voice', levels: [-3, -1, 3, 4, 1], boost: 0 },
];

const dolbyPresets = [
  { name: 'Dolby Open', levels: [2, 3, 4, 3, 2], boost: 400 },
  { name: 'Dolby Rich', levels: [4, 2, 1, 2, 4], boost: 600 },
  { name: 'Dolby Focused', levels: [-1, 1, 5, 2, -1], boost: 200 },
];

const diracPresets = [
  { name: 'Dirac Music', levels: [3, 2, 2, 2, 3], boost: 500 },
  { name: 'Dirac Movie', levels: [5, 1, 0, 2, 4], boost: 700 },
  { name: 'Dirac Game', levels: [4, 3, 1, 3, 5], boost: 600 },
];

export default function EqualizerSettingsScreen() {
  const {
    colors,
    colorScheme,
    equalizerEnabled,
    setEqualizerEnabled,
    equalizerBassBoost,
    setEqualizerBassBoost,
    equalizerBandLevels,
    setEqualizerBandLevels,
  } = useAppTheme();
  
  const isDark = colorScheme === 'dark';
  const [activeTab, setActiveTab] = useState<EqualizerTab>('simple');
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Local state for 60fps UI adjustments
  const [localBandLevels, setLocalBandLevels] = useState<number[]>(equalizerBandLevels);
  const [localBassBoost, setLocalBassBoost] = useState<number>(equalizerBassBoost);

  // Keep refs of local state to avoid stale closure issues in touch handlers
  const localBandsRef = useRef(localBandLevels);
  const localBassRef = useRef(localBassBoost);

  useEffect(() => {
    localBandsRef.current = localBandLevels;
  }, [localBandLevels]);

  useEffect(() => {
    localBassRef.current = localBassBoost;
  }, [localBassBoost]);

  // Sync with global context changes (Presets/Hydration)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalBandLevels(equalizerBandLevels);
  }, [equalizerBandLevels]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalBassBoost(equalizerBassBoost);
  }, [equalizerBassBoost]);

  // Throttled and immediate commit refs & handlers
  const latestBandsRef = useRef(equalizerBandLevels);
  const latestBassRef = useRef(equalizerBassBoost);
  const throttleTimeoutRef = useRef<any>(null);

  const throttleSync = (newBands: number[], newBass: number) => {
    latestBandsRef.current = newBands;
    latestBassRef.current = newBass;

    if (!throttleTimeoutRef.current) {
      throttleTimeoutRef.current = setTimeout(() => {
        throttleTimeoutRef.current = null;
        setEqualizerBandLevels(latestBandsRef.current);
        setEqualizerBassBoost(latestBassRef.current);
      }, 100);
    }
  };

  const commitSync = (newBands: number[], newBass: number) => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
    setEqualizerBandLevels(newBands);
    setEqualizerBassBoost(newBass);
  };

  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  // Radial math calculations
  const cx = 130;
  const cy = 130;
  const maxRadius = 90;

  // Spoke 0: Mids (Top, 270 deg or -90 deg)
  const midsVal = Math.round((localBandLevels[1] + localBandLevels[2]) / 2);
  const rMids = maxRadius * ((midsVal + 15) / 30);
  const xMids = cx;
  const yMids = cy - rMids;

  // Spoke 1: Treble (Bottom Left, 150 deg)
  const trebleVal = Math.round((localBandLevels[3] + localBandLevels[4]) / 2);
  const rTreble = maxRadius * ((trebleVal + 15) / 30);
  const xTreble = cx - rTreble * Math.cos(30 * Math.PI / 180);
  const yTreble = cy + rTreble * Math.sin(30 * Math.PI / 180);

  // Spoke 2: Bass (Bottom Right, 30 deg)
  const rBass = maxRadius * (localBassBoost / 1000);
  const xBass = cx + rBass * Math.cos(30 * Math.PI / 180);
  const yBass = cy + rBass * Math.sin(30 * Math.PI / 180);

  const handleRadialTouch = (event: any) => {
    if (!equalizerEnabled) return;
    const { locationX, locationY } = event.nativeEvent;
    const dx = locationX - cx;
    const dy = locationY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    const rawVal = Math.min(dist / maxRadius, 1.0); // 0 to 1.0

    // Distances to spokes
    const diffMids = Math.abs(angle - 270);
    const diffTreble = Math.abs(angle - 150);
    const diffBass = Math.min(Math.abs(angle - 30), Math.abs(angle - 390));

    const minDiff = Math.min(diffMids, diffTreble, diffBass);

    if (minDiff === diffMids) {
      // Mids spoke: maps 0..1 to -15..15 dB
      const level = Math.round(rawVal * 30 - 15);
      const newBands = [...localBandLevels];
      newBands[1] = level;
      newBands[2] = level;
      setLocalBandLevels(newBands);
      throttleSync(newBands, localBassBoost);
    } else if (minDiff === diffTreble) {
      // Treble spoke: maps 0..1 to -15..15 dB
      const level = Math.round(rawVal * 30 - 15);
      const newBands = [...localBandLevels];
      newBands[3] = level;
      newBands[4] = level;
      setLocalBandLevels(newBands);
      throttleSync(newBands, localBassBoost);
    } else {
      // Bass spoke: maps 0..1 to 0..1000 (Bass boost strength) and band 0 (60Hz)
      const boost = Math.round(rawVal * 1000);
      setLocalBassBoost(boost);

      const level = Math.round(rawVal * 30 - 15);
      const newBands = [...localBandLevels];
      newBands[0] = level;
      setLocalBandLevels(newBands);
      throttleSync(newBands, boost);
    }
  };

  const applyPreset = (preset: { levels: number[]; boost: number }) => {
    if (!equalizerEnabled) return;
    setLocalBandLevels(preset.levels);
    setLocalBassBoost(preset.boost);
    commitSync(preset.levels, preset.boost);
  };

  const bandFrequencies = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

  return (
    <ThemedView style={styles.screen}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ title: 'Equalizer' }} />
      <ScrollView
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Equalizer</Text>

        {/* Master EQ Switch Card */}
        <BunnyCard style={styles.masterCard}>
          <View style={styles.masterRow}>
            <View style={styles.masterInfo}>
              <Typography variant="large">Equalizer</Typography>
              <Muted>Toggle professional audio processing</Muted>
            </View>
            <Switch
              checked={equalizerEnabled}
              onCheckedChange={setEqualizerEnabled}
              style={{ marginBottom: 0 }}
            />
          </View>
        </BunnyCard>

        {/* Segmented Mode Selector */}
        <SegmentedControl
          options={[
            { value: 'simple', label: 'Simple' },
            { value: 'advanced', label: 'Advanced' },
          ]}
          selectedValue={activeTab}
          onChange={(val) => setActiveTab(val as EqualizerTab)}
          style={{ marginBottom: 16 }}
        />

        {/* Simple Mode: SVG Constellation */}
        {activeTab === 'simple' && (
          <View style={styles.simpleModeContainer}>
            <View 
              onTouchStart={() => {
                if (equalizerEnabled) setScrollEnabled(false);
              }}
              onTouchEnd={() => {
                setScrollEnabled(true);
                commitSync(localBandsRef.current, localBassRef.current);
              }}
              onTouchCancel={() => {
                setScrollEnabled(true);
                commitSync(localBandsRef.current, localBassRef.current);
              }}
              onStartShouldSetResponder={() => equalizerEnabled}
              onMoveShouldSetResponder={() => equalizerEnabled}
              onResponderGrant={handleRadialTouch}
              onResponderMove={handleRadialTouch}
              onResponderRelease={() => {
                setScrollEnabled(true);
                commitSync(localBandsRef.current, localBassRef.current);
              }}
              onResponderTerminate={() => {
                setScrollEnabled(true);
                commitSync(localBandsRef.current, localBassRef.current);
              }}
              style={[
                styles.svgWrapper, 
                { 
                  borderColor: colors.border,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                  opacity: equalizerEnabled ? 1 : 0.4
                }
              ]}
            >
              <Svg width={260} height={260} pointerEvents="none">
                {/* Background Guide Circles */}
                <Circle cx={cx} cy={cy} r={maxRadius} stroke={colors.border} strokeWidth="1" strokeDasharray="3,3" fill="none" />
                <Circle cx={cx} cy={cy} r={maxRadius * 0.6} stroke={colors.border} strokeWidth="0.5" strokeDasharray="2,2" fill="none" fillOpacity={0} />
                <Circle cx={cx} cy={cy} r={maxRadius * 0.3} stroke={colors.border} strokeWidth="0.5" strokeDasharray="2,2" fill="none" fillOpacity={0} />

                {/* Guide Spokes Lines */}
                {/* Mids Spoke (Up) */}
                <Line x1={cx} y1={cy} x2={cx} y2={cy - maxRadius} stroke={colors.border} strokeWidth="1" strokeDasharray="2,2" />
                {/* Treble Spoke (Bottom Left) */}
                <Line x1={cx} y1={cy} x2={cx - maxRadius * Math.cos(30 * Math.PI / 180)} y2={cy + maxRadius * Math.sin(30 * Math.PI / 180)} stroke={colors.border} strokeWidth="1" strokeDasharray="2,2" />
                {/* Bass Spoke (Bottom Right) */}
                <Line x1={cx} y1={cy} x2={cx + maxRadius * Math.cos(30 * Math.PI / 180)} y2={cy + maxRadius * Math.sin(30 * Math.PI / 180)} stroke={colors.border} strokeWidth="1" strokeDasharray="2,2" />

                {/* Constellation Triangle */}
                <Polygon
                  points={`${xMids},${yMids} ${xTreble},${yTreble} ${xBass},${yBass}`}
                  stroke={colors.primary}
                  strokeWidth="2"
                  strokeDasharray="4,4"
                  fill={addAlpha(colors.primary, 0.05)}
                />

                {/* Handles & Value Labels */}
                {/* Center Node */}
                <Circle cx={cx} cy={cy} r="4" fill={colors.mutedForeground} />

                {/* Mids Handle */}
                <Circle cx={xMids} cy={yMids} r="8" fill={colors.primary} />
                <Circle cx={xMids} cy={yMids} r="4" fill="#FFFFFF" />
                
                {/* Treble Handle */}
                <Circle cx={xTreble} cy={yTreble} r="8" fill={colors.primary} />
                <Circle cx={xTreble} cy={yTreble} r="4" fill="#FFFFFF" />

                {/* Bass Handle */}
                <Circle cx={xBass} cy={yBass} r="8" fill={colors.primary} />
                <Circle cx={xBass} cy={yBass} r="4" fill="#FFFFFF" />

                {/* SVG Text Labels */}
                <SvgText x={cx} y={cy - maxRadius - 12} fill={colors.text} fontSize="11" fontWeight="700" textAnchor="middle">
                  {`Mids (${midsVal > 0 ? '+' : ''}${midsVal})`}
                </SvgText>
                <SvgText x={cx - maxRadius * 0.866 - 20} y={cy + maxRadius * 0.5 + 16} fill={colors.text} fontSize="11" fontWeight="700" textAnchor="middle">
                  {`Treble (${trebleVal > 0 ? '+' : ''}${trebleVal})`}
                </SvgText>
                <SvgText x={cx + maxRadius * 0.866 + 20} y={cy + maxRadius * 0.5 + 16} fill={colors.text} fontSize="11" fontWeight="700" textAnchor="middle">
                  {`Bass (+${Math.round(localBassBoost / 10)}%)`}
                </SvgText>
              </Svg>
            </View>
          </View>
        )}

        {/* Advanced Mode: Standard Frequency Sliders */}
        {activeTab === 'advanced' && (
          <BunnyCard style={[styles.slidersCard, { opacity: equalizerEnabled ? 1 : 0.4 }]}>
            {localBandLevels.map((level, idx) => (
              <View key={idx} style={styles.sliderRow}>
                <Typography style={styles.bandLabel}>{bandFrequencies[idx]}</Typography>
                <Slider
                  style={styles.slider}
                  value={level}
                  onValueChange={(val) => {
                    const newBands = [...localBandLevels];
                    newBands[idx] = Math.round(val);
                    setLocalBandLevels(newBands);
                    throttleSync(newBands, localBassBoost);
                  }}
                  onSlidingComplete={(val: number) => {
                    const newBands = [...localBandsRef.current];
                    newBands[idx] = Math.round(val);
                    setLocalBandLevels(newBands);
                    commitSync(newBands, localBassRef.current);
                  }}
                  min={-15}
                  max={15}
                  disabled={!equalizerEnabled}
                />
                <Typography style={styles.valueLabel}>
                  {level > 0 ? `+${level}` : level} dB
                </Typography>
              </View>
            ))}

            {/* Separate Bass Boost Slider */}
            <View style={[styles.sliderRow, { borderTopWidth: 0.5, borderColor: colors.border, paddingTop: 12 }]}>
              <Typography style={styles.bandLabel}>Bass Boost</Typography>
              <Slider
                style={styles.slider}
                value={localBassBoost}
                onValueChange={(val) => {
                  const boost = Math.round(val / 50) * 50;
                  setLocalBassBoost(boost);
                  throttleSync(localBandLevels, boost);
                }}
                onSlidingComplete={(val: number) => {
                  const boost = Math.round(val / 50) * 50;
                  setLocalBassBoost(boost);
                  commitSync(localBandsRef.current, boost);
                }}
                min={0}
                max={1000}
                disabled={!equalizerEnabled}
              />
              <Typography style={styles.valueLabel}>
                {Math.round(localBassBoost / 10)}%
              </Typography>
            </View>
          </BunnyCard>
        )}

        {/* ─── Sound Presets Grids ─── */}
        <View style={[styles.presetsSection, { opacity: equalizerEnabled ? 1 : 0.5 }]}>
          <H3 style={styles.sectionTitle}>Bunny Signature</H3>
          <View style={styles.presetsGrid}>
            {bunnyPresets.map((preset) => (
              <Pressable
                key={preset.name}
                onPress={() => applyPreset(preset)}
                style={[
                  styles.presetBtn,
                  { backgroundColor: colors.card, borderColor: colors.border }
                ]}
              >
                <Typography style={{ fontSize: 13, fontWeight: '600' }}>{preset.name}</Typography>
              </Pressable>
            ))}
          </View>

          <H3 style={[styles.sectionTitle, { marginTop: 24 }]}>Dolby Atmos</H3>
          <View style={styles.presetsGrid}>
            {dolbyPresets.map((preset) => (
              <Pressable
                key={preset.name}
                onPress={() => applyPreset(preset)}
                style={[
                  styles.presetBtn,
                  { backgroundColor: colors.card, borderColor: colors.border }
                ]}
              >
                <Typography style={{ fontSize: 13, fontWeight: '600' }}>{preset.name}</Typography>
              </Pressable>
            ))}
          </View>

          <H3 style={[styles.sectionTitle, { marginTop: 24 }]}>Dirac Audio</H3>
          <View style={styles.presetsGrid}>
            {diracPresets.map((preset) => (
              <Pressable
                key={preset.name}
                onPress={() => applyPreset(preset)}
                style={[
                  styles.presetBtn,
                  { backgroundColor: colors.card, borderColor: colors.border }
                ]}
              >
                <Typography style={{ fontSize: 13, fontWeight: '600' }}>{preset.name}</Typography>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

// Alpha transparency helper
function addAlpha(hexColor: string, opacity: number): string {
  const normalizedColor = hexColor.replace('#', '');
  const r = parseInt(normalizedColor.substring(0, 2), 16);
  const g = parseInt(normalizedColor.substring(2, 4), 16);
  const b = parseInt(normalizedColor.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 100,
    paddingBottom: 40,
  },
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  masterCard: {
    marginBottom: 20,
  },
  masterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  masterInfo: {
    flex: 1,
    gap: 2,
  },
  simpleModeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  svgWrapper: {
    borderRadius: 140,
    borderWidth: 1.5,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  slidersCard: {
    marginBottom: 24,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  bandLabel: {
    width: 70,
    fontWeight: '600',
    fontSize: 14,
  },
  slider: {
    flex: 1,
    height: 30,
    marginHorizontal: 8,
  },
  valueLabel: {
    width: 50,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '600',
  },
  presetsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginLeft: 4,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
  },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: (screenWidth - 48) / 3.2,
  },
});
