import React, { useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Play, Type, AlignLeft, Check, ChevronRight } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import { H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';

const playerStyleOptions = [
  { label: 'Flat Gradient', value: 'flat' },
  { label: 'Solid Dark', value: 'solid' },
] as const;

const lyricsSizeOptions = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
] as const;

const lyricsSpacingOptions = [
  { label: 'Compact', value: 'compact' },
  { label: 'Regular', value: 'regular' },
  { label: 'Spacious', value: 'spacious' },
] as const;

export default function LyricsSettingsScreen() {
  const { 
    colors, 
    colorScheme,
    playerStyle, 
    setPlayerStyle, 
    lyricsSize, 
    setLyricsSize, 
    lyricsSpacing, 
    setLyricsSpacing 
  } = useAppTheme();
  
  const isDark = colorScheme === 'dark';

  const playerStyleSheetRef = useRef<BottomSheetModal>(null);
  const sizeSheetRef = useRef<BottomSheetModal>(null);
  const spacingSheetRef = useRef<BottomSheetModal>(null);

  const playerStyleSnapPoints = useMemo(() => ['30%'], []);
  const sizeSnapPoints = useMemo(() => ['32%'], []);
  const spacingSnapPoints = useMemo(() => ['32%'], []);

  const currentPlayerStyleLabel = playerStyleOptions.find((o) => o.value === playerStyle)?.label ?? 'Flat Gradient';
  const currentLyricsSizeLabel = lyricsSizeOptions.find((o) => o.value === lyricsSize)?.label ?? 'Medium';
  const currentLyricsSpacingLabel = lyricsSpacingOptions.find((o) => o.value === lyricsSpacing)?.label ?? 'Regular';

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
      <Stack.Screen options={{ title: 'Player & Lyrics' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Player & Lyrics</Text>

        
        {/* Player Style Card */}
        <Pressable onPress={() => playerStyleSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Play size={20} color={colors.primary} fill={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Player Background UI</Typography>
                <Muted>Select background style for player</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {currentPlayerStyleLabel}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>

        <H3 style={styles.sectionTitle}>Lyrics Layout</H3>

        {/* Lyrics Font Size Card */}
        <Pressable onPress={() => sizeSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Type size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Lyrics Font Size</Typography>
                <Muted>Select the text size for lyrics</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {currentLyricsSizeLabel}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>

        {/* Lyrics Line Spacing Card */}
        <Pressable onPress={() => spacingSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <AlignLeft size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Lyrics Line Spacing</Typography>
                <Muted>Select vertical spacing for lyrics</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {currentLyricsSpacingLabel}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>
      </ScrollView>

      {/* ─── Player Style Bottom Sheet ─── */}
      <BottomSheetModal
        ref={playerStyleSheetRef}
        snapPoints={playerStyleSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Player Style</Typography>
          </View>
          {playerStyleOptions.map((item, index) => {
            const selected = playerStyle === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  setPlayerStyle(item.value);
                  playerStyleSheetRef.current?.dismiss();
                }}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < playerStyleOptions.length - 1 ? 0.5 : 0 },
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

      {/* ─── Lyrics Font Size Bottom Sheet ─── */}
      <BottomSheetModal
        ref={sizeSheetRef}
        snapPoints={sizeSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Lyrics Size</Typography>
          </View>
          {lyricsSizeOptions.map((item, index) => {
            const selected = lyricsSize === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  setLyricsSize(item.value);
                  sizeSheetRef.current?.dismiss();
                }}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < lyricsSizeOptions.length - 1 ? 0.5 : 0 },
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

      {/* ─── Lyrics Line Spacing Bottom Sheet ─── */}
      <BottomSheetModal
        ref={spacingSheetRef}
        snapPoints={spacingSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Lyrics Spacing</Typography>
          </View>
          {lyricsSpacingOptions.map((item, index) => {
            const selected = lyricsSpacing === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  setLyricsSpacing(item.value);
                  spacingSheetRef.current?.dismiss();
                }}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < lyricsSpacingOptions.length - 1 ? 0.5 : 0 },
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
