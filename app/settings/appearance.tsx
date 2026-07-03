import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { Stack } from 'expo-router';
import { Check, ChevronRight, Moon, Paintbrush, Type } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { BunnyCard } from '@/components/ui/bunny-card';
import { H3, Muted, Typography } from '@/components/ui/typography';
import { ThemeVariantOptions, getFontFamilies, type ThemeFontName, type ThemeMode } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';

const themeModes: Array<{ label: string; value: ThemeMode }> = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const themeFonts: Array<{ label: string; value: ThemeFontName }> = [
  { label: 'Sans', value: 'sans' },
  { label: 'Serif', value: 'serif' },
  { label: 'Rounded', value: 'rounded' },
  { label: 'Mono', value: 'mono' },
  { label: 'Poppins', value: 'poppins' },
  { label: 'Nunito', value: 'nunito' },
  { label: 'Combo', value: 'combo' },
];

export default function AppearanceSettingsScreen() {
  const { mode, setMode, variant, setVariant, font, setFont, colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';

  const [isApplying, setIsApplying] = useState(false);
  const [loadingText, setLoadingText] = useState('Applying theme...');

  const modeSheetRef = useRef<BottomSheetModal>(null);
  const variantSheetRef = useRef<BottomSheetModal>(null);
  const fontSheetRef = useRef<BottomSheetModal>(null);

  const modeSnapPoints = useMemo(() => ['32%'], []);
  const variantSnapPoints = useMemo(() => ['55%'], []);
  const fontSnapPoints = useMemo(() => ['75%'], []);

  const applySettingWithLoading = (type: 'mode' | 'variant' | 'font', value: any) => {
    if (type === 'mode') {
      modeSheetRef.current?.dismiss();
      setLoadingText('Applying theme mode...');
    } else if (type === 'variant') {
      variantSheetRef.current?.dismiss();
      setLoadingText('Updating accent color...');
    } else if (type === 'font') {
      fontSheetRef.current?.dismiss();
      setLoadingText('Changing font family...');
    }

    setIsApplying(true);

    setTimeout(() => {
      if (type === 'mode') setMode(value);
      else if (type === 'variant') setVariant(value);
      else if (type === 'font') setFont(value);

      setTimeout(() => {
        setIsApplying(false);
      }, 500);
    }, 450);
  };

  const currentModeLabel = themeModes.find((m) => m.value === mode)?.label ?? 'System';
  const currentFontLabel = themeFonts.find((f) => f.value === font)?.label ?? 'Sans';

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
      <Stack.Screen options={{ title: 'Appearance' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Appearance</Text>


        {/* Theme Mode Card */}
        <Pressable onPress={() => modeSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Moon size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Theme Mode</Typography>
                <Muted>Choose how Bunny looks</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {currentModeLabel}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>

        {/* Accent Color Card */}
        <Pressable onPress={() => variantSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Paintbrush size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Accent Color</Typography>
                <Muted>Personalize the app colors</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {variant}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>

        {/* Typography Card */}
        <Pressable onPress={() => fontSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Type size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Typography</Typography>
                <Muted>Select the app font family</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography
                  style={[
                    styles.selectedValue,
                    {
                      color: colors.mutedForeground,
                      fontFamily: getFontFamilies(font).body,
                    },
                  ]}
                >
                  {currentFontLabel}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>
      </ScrollView>

      {/* ─── Theme Mode Bottom Sheet ─── */}
      <BottomSheetModal
        ref={modeSheetRef}
        snapPoints={modeSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Theme Mode</Typography>
          </View>
          {themeModes.map((item, index) => {
            const selected = mode === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => applySettingWithLoading('mode', item.value)}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < themeModes.length - 1 ? 0.5 : 0 },
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

      {/* ─── Accent Color Bottom Sheet ─── */}
      <BottomSheetModal
        ref={variantSheetRef}
        snapPoints={variantSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={[styles.sheetContent, { flex: 1 }]}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Accent Color</Typography>
          </View>
          <BottomSheetScrollView style={styles.sheetScroll}>
            {ThemeVariantOptions.map((item, index) => {
              const selected = variant === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => applySettingWithLoading('variant', item)}
                  style={[
                    styles.sheetOptionRow,
                    { borderBottomColor: colors.border, borderBottomWidth: index < ThemeVariantOptions.length - 1 ? 0.5 : 0 },
                    selected && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  ]}
                >
                  <Typography style={[styles.optionLabel, selected && { color: colors.primary, fontWeight: '700' }]}>
                    {item}
                  </Typography>
                  {selected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      {/* ─── Typography Bottom Sheet ─── */}
      <BottomSheetModal
        ref={fontSheetRef}
        snapPoints={fontSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={[styles.sheetContent, { flex: 1 }]}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Font Family</Typography>
          </View>
          <BottomSheetScrollView style={styles.sheetScroll}>
            {themeFonts.map((item, index) => {
              const selected = font === item.value;
              const previewFontFamily = getFontFamilies(item.value).body;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => applySettingWithLoading('font', item.value)}
                  style={[
                    styles.sheetOptionRow,
                    { borderBottomColor: colors.border, borderBottomWidth: index < themeFonts.length - 1 ? 0.5 : 0 },
                    selected && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                  ]}
                >
                  <View style={styles.fontOptionContent}>
                    <Typography
                      style={[
                        styles.optionLabel,
                        { fontFamily: previewFontFamily },
                        selected && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {item.label}
                    </Typography>
                    <Muted style={{ fontFamily: previewFontFamily, fontSize: 12 }}>
                      The quick brown fox jumps over the lazy dog
                    </Muted>
                  </View>
                  {selected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </BottomSheetScrollView>
        </BottomSheetView>
      </BottomSheetModal>

      {isApplying && (
        <View style={styles.loadingOverlay}>
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={isDark ? 30 : 60}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          </View>
          <BunnyCard style={styles.loadingCard} glass={true} elevated={true}>
            <View style={{ alignItems: 'center', gap: 16, paddingVertical: 10 }}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Typography style={{ fontWeight: '700', fontSize: 16 }}>
                {loadingText}
              </Typography>
            </View>
          </BunnyCard>
        </View>
      )}
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
  sheetScroll: { flex: 1 },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionLabel: { fontSize: 16 },
  fontOptionContent: {
    flex: 1,
    gap: 3,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  loadingCard: {
    width: 260,
    borderRadius: 24,
  },
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
});
