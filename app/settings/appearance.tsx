import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';

import { H1, H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { ThemeVariantOptions, type ThemeFontName, type ThemeMode } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { IconSymbol } from '@/components/ui/icon-symbol';

const themeModes: Array<{ label: string; value: ThemeMode; icon: any }> = [
  { label: 'System', value: 'system', icon: 'gearshape.fill' },
  { label: 'Light', value: 'light', icon: 'house.fill' },
  { label: 'Dark', value: 'dark', icon: 'moon.fill' },
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
  const { mode, setMode, variant, setVariant, font, setFont, colors } = useAppTheme();
  const router = useRouter();

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Appearance' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Theme Mode Section */}
        <H3 style={styles.sectionTitle}>Theme Mode</H3>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <IconSymbol name="moon.fill" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Theme Mode</Typography>
              <Muted>Choose how Bunny looks</Muted>
            </View>
          </View>
          <View style={styles.chipContainer}>
            {themeModes.map((option) => {
              const selected = mode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setMode(option.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}>
                  <Typography
                    style={{
                      color: selected ? colors.primaryForeground : colors.text,
                      fontSize: 13,
                    }}>
                    {option.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </BunnyCard>

        {/* Accent Color Section */}
        <H3 style={styles.sectionTitle}>Accent Color</H3>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <IconSymbol name="paintbrush.fill" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Variant</Typography>
              <Muted>Personalize the app colors</Muted>
            </View>
          </View>
          <View style={[styles.chipContainer, styles.grid]}>
            {ThemeVariantOptions.map((option) => {
              const selected = variant === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setVariant(option)}
                  style={[
                    styles.chip,
                    styles.gridChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}>
                  <Typography
                    style={{
                      color: selected ? colors.primaryForeground : colors.text,
                      fontSize: 13,
                    }}>
                    {option}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </BunnyCard>

        {/* Typography Section */}
        <H3 style={styles.sectionTitle}>Typography</H3>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <IconSymbol name="textformat" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Font Family</Typography>
              <Muted>Select the app typography</Muted>
            </View>
          </View>
          <View style={[styles.chipContainer, styles.grid]}>
            {themeFonts.map((option) => {
              const selected = font === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setFont(option.value)}
                  style={[
                    styles.chip,
                    styles.gridChip,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                    },
                  ]}>
                  <Typography
                    style={{
                      color: selected ? colors.primaryForeground : colors.text,
                      fontSize: 13,
                    }}>
                    {option.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </BunnyCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  backButton: {
    padding: 4,
    marginLeft: -4,
  },
  titleText: {
    fontSize: 28,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginTop: 10,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  settingInfo: {
    flex: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  grid: {
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  gridChip: {
    minWidth: '30%',
    alignItems: 'center',
  },
});
