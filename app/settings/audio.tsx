import React, { useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Sliders, Check, ChevronRight, Zap, AlignLeft } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import { H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';

const qualityOptions = [
  { label: 'Low (64kbps)', value: 'low' },
  { label: 'Medium (128kbps)', value: 'medium' },
  { label: 'High (320kbps)', value: 'high' },
] as const;

const preResolveOptions = [
  { label: 'Disabled (0 songs)', value: 0 },
  { label: '1 song ahead', value: 1 },
  { label: '2 songs ahead (Recommended)', value: 2 },
  { label: '3 songs ahead', value: 3 },
  { label: '5 songs ahead', value: 5 },
] as const;

const lyricsPrefetchOptions = [
  { label: 'Enabled (Pre-fetch lyrics)', value: true },
  { label: 'Disabled', value: false },
] as const;

export default function AudioSettingsScreen() {
  const {
    colors,
    colorScheme,
    audioQuality,
    setAudioQuality,
    preResolveLimit,
    setPreResolveLimit,
    lyricsPrefetch,
    setLyricsPrefetch,
  } = useAppTheme();
  const isDark = colorScheme === 'dark';

  const qualitySheetRef = useRef<BottomSheetModal>(null);
  const preResolveSheetRef = useRef<BottomSheetModal>(null);
  const prefetchSheetRef = useRef<BottomSheetModal>(null);

  const qualitySnapPoints = useMemo(() => ['32%'], []);
  const preResolveSnapPoints = useMemo(() => ['42%'], []);
  const prefetchSnapPoints = useMemo(() => ['28%'], []);

  const currentQualityLabel = qualityOptions.find((o) => o.value === audioQuality)?.label ?? 'Medium (128kbps)';

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    []
  );

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Playback & Audio' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Playback & Audio</Text>
      
        {/* Audio Quality Card */}
        <Pressable onPress={() => qualitySheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Sliders size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Audio Quality</Typography>
                <Muted>Select stream audio bitrate</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {currentQualityLabel.split(' ')[0]}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>

        {/* Pre-resolve Limit Card */}
        <Pressable onPress={() => preResolveSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Zap size={20} color={colors.primary} fill={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Pre-resolve Queue Limit</Typography>
                <Muted>How many upcoming songs to pre-buffer</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {preResolveLimit === 0 ? 'Disabled' : `${preResolveLimit} songs`}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>

        {/* Lyrics Pre-fetch Card */}
        <Pressable onPress={() => prefetchSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <AlignLeft size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Lyrics Pre-fetch</Typography>
                <Muted>Pre-download lyrics for upcoming songs</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {lyricsPrefetch ? 'Enabled' : 'Disabled'}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>
      </ScrollView>

      {/* ─── Audio Quality Bottom Sheet ─── */}
      <BottomSheetModal
        ref={qualitySheetRef}
        snapPoints={qualitySnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Audio Quality</Typography>
          </View>
          {qualityOptions.map((item, index) => {
            const selected = audioQuality === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  setAudioQuality(item.value);
                  qualitySheetRef.current?.dismiss();
                }}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < qualityOptions.length - 1 ? 0.5 : 0 },
                  selected && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Typography style={[styles.optionLabel, selected && { color: colors.primary, fontWeight: '700' }]}>
                  {item.label}
                </Typography>
                {selected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>

      {/* ─── Pre-resolve Limit Bottom Sheet ─── */}
      <BottomSheetModal
        ref={preResolveSheetRef}
        snapPoints={preResolveSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Pre-resolve Limit</Typography>
          </View>
          {preResolveOptions.map((item, index) => {
            const selected = preResolveLimit === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  setPreResolveLimit(item.value);
                  preResolveSheetRef.current?.dismiss();
                }}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < preResolveOptions.length - 1 ? 0.5 : 0 },
                  selected && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Typography style={[styles.optionLabel, selected && { color: colors.primary, fontWeight: '700' }]}>
                  {item.label}
                </Typography>
                {selected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>

      {/* ─── Lyrics Pre-fetch Bottom Sheet ─── */}
      <BottomSheetModal
        ref={prefetchSheetRef}
        snapPoints={prefetchSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Lyrics Pre-fetch</Typography>
          </View>
          {lyricsPrefetchOptions.map((item, index) => {
            const selected = lyricsPrefetch === item.value;
            return (
              <Pressable
                key={String(item.value)}
                onPress={() => {
                  setLyricsPrefetch(item.value);
                  prefetchSheetRef.current?.dismiss();
                }}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < lyricsPrefetchOptions.length - 1 ? 0.5 : 0 },
                  selected && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Typography style={[styles.optionLabel, selected && { color: colors.primary, fontWeight: '700' }]}>
                  {item.label}
                </Typography>
                {selected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    paddingHorizontal: 16,
    paddingTop: 100,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 12,
    marginLeft: 4,
  },
  navCard: { marginBottom: 12 },
  navSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: { flex: 1 },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedValue: { fontSize: 14, marginRight: 4 },
  sheetContent: {
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionLabel: { fontSize: 16 },
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
});
