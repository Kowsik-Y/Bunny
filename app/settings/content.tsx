import React, { useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Text } from 'react-native';
import { Stack } from 'expo-router';
import { ShieldAlert, Globe, Check, ChevronRight } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import { Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { Switch } from '@/components/ui/switch';

const languageOptions = [
  { label: 'English', value: 'English' },
  { label: 'Hindi (हिन्दी)', value: 'Hindi' },
  { label: 'Punjabi (ਪੰਜਾਬੀ)', value: 'Punjabi' },
  { label: 'Tamil (தமிழ்)', value: 'Tamil' },
  { label: 'Telugu (తెలుగు)', value: 'Telugu' },
  { label: 'Kannada (ಕನ್ನಡ)', value: 'Kannada' },
  { label: 'Malayalam (മലയാളം)', value: 'Malayalam' },
  { label: 'Marathi (मराठी)', value: 'Marathi' },
  { label: 'Bengali (বাংলা)', value: 'Bengali' },
  { label: 'Spanish (Español)', value: 'Spanish' },
  { label: 'French (Français)', value: 'French' },
  { label: 'German (Deutsch)', value: 'German' },
  { label: 'Japanese (日本語)', value: 'Japanese' },
  { label: 'Korean (한국어)', value: 'Korean' },
];

export default function ContentSettingsScreen() {
  const {
    colors,
    colorScheme,
    explicitContentEnabled,
    setExplicitContentEnabled,
    recommendationLanguages,
    setRecommendationLanguages,
  } = useAppTheme();
  
  const isDark = colorScheme === 'dark';
  const languageSheetRef = useRef<BottomSheetModal>(null);
  const languageSnapPoints = useMemo(() => ['65%'], []);

  const selectedLanguagesLabel = useMemo(() => {
    if (!recommendationLanguages || recommendationLanguages.length === 0) {
      return 'Automatic (Location)';
    }
    return recommendationLanguages.join(', ');
  }, [recommendationLanguages]);

  const handleLanguageToggle = (langValue: string) => {
    let updated = [...(recommendationLanguages || [])];
    if (updated.includes(langValue)) {
      updated = updated.filter((l) => l !== langValue);
    } else {
      updated.push(langValue);
    }
    setRecommendationLanguages(updated);
  };

  const handleResetLanguages = () => {
    setRecommendationLanguages([]);
  };

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
      <Stack.Screen options={{ title: 'Content & Languages' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Content & Languages</Text>

        <BunnyCard style={styles.settingCard}>
          {/* Explicit Content Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <ShieldAlert size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Explicit Content</Typography>
              <Muted>Show explicit music (marked with an E badge)</Muted>
            </View>
            <Switch
              checked={explicitContentEnabled}
              onCheckedChange={setExplicitContentEnabled}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

          {/* Recommendation Languages */}
          <Pressable onPress={() => languageSheetRef.current?.present()}>
            <View style={styles.settingRow}>
              <View style={styles.iconContainer}>
                <Globe size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Recommendation Languages</Typography>
                <Muted numberOfLines={1}>Tailor home suggestions to preferred languages</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography numberOfLines={1} style={[styles.selectedValue, { color: colors.mutedForeground, maxWidth: 120 }]}>
                  {selectedLanguagesLabel}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </Pressable>
        </BunnyCard>
      </ScrollView>

      {/* ─── Recommendation Languages Bottom Sheet ─── */}
      <BottomSheetModal
        ref={languageSheetRef}
        snapPoints={languageSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Recommendation Languages</Typography>
            <Muted style={{ marginTop: 2, textAlign: 'center' }}>
              Select one or more languages. If none selected, recommendations will be automatically tailored to your detected location.
            </Muted>
          </View>

          <ScrollView 
            style={styles.sheetScrollView} 
            showsVerticalScrollIndicator={true}
          >
            {languageOptions.map((item, index) => {
              const selected = recommendationLanguages.includes(item.value);
              return (
                <Pressable
                  key={item.value}
                  onPress={() => handleLanguageToggle(item.value)}
                  style={[
                    styles.sheetOptionRow,
                    { borderBottomColor: colors.border, borderBottomWidth: index < languageOptions.length - 1 ? 0.5 : 0 },
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
          </ScrollView>

          {recommendationLanguages.length > 0 && (
            <Pressable
              onPress={handleResetLanguages}
              style={[
                styles.resetBtn,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                }
              ]}
            >
              <Typography style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                Reset to Automatic (Location)
              </Typography>
            </Pressable>
          )}
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
  settingCard: {
    paddingVertical: 12,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
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
  settingInfo: { flex: 1, marginRight: 8 },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedValue: { fontSize: 14, marginRight: 4 },
  sheetContent: {
    flex: 1,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetScrollView: {
    flex: 1,
    maxHeight: 280,
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
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  resetBtn: {
    marginTop: 16,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
