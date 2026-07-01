import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';

import { H1, H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function LyricsSettingsScreen() {
  const { colors, playerStyle, setPlayerStyle, lyricsSize, setLyricsSize, lyricsSpacing, setLyricsSpacing } = useAppTheme();
  const router = useRouter();

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Player & Lyrics' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Player Background Card */}
        <H3 style={styles.sectionTitle}>Player Style</H3>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <IconSymbol name="play.fill" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Player Background UI</Typography>
              <Muted>Select background style for player</Muted>
            </View>
          </View>
          <View style={styles.chipContainer}>
            {([
              { label: 'Flat Gradient', value: 'flat' },
              { label: 'Solid Dark', value: 'solid' }
            ] as const).map((option) => {
              const selected = playerStyle === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setPlayerStyle(option.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                      flex: 1,
                      alignItems: 'center',
                    },
                  ]}>
                  <Typography
                    style={{
                      color: selected ? colors.primaryForeground : colors.text,
                      fontSize: 11,
                    }}>
                    {option.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </BunnyCard>

        {/* Lyrics Size Card */}
        <H3 style={styles.sectionTitle}>Lyrics Size</H3>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <IconSymbol name="textformat" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Lyrics Font Size</Typography>
              <Muted>Select the text size for lyrics</Muted>
            </View>
          </View>
          <View style={styles.chipContainer}>
            {([
              { label: 'Small', value: 'small' },
              { label: 'Medium', value: 'medium' },
              { label: 'Large', value: 'large' }
            ] as const).map((option) => {
              const selected = lyricsSize === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setLyricsSize(option.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                      flex: 1,
                      alignItems: 'center',
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

        {/* Lyrics Spacing Card */}
        <H3 style={styles.sectionTitle}>Lyrics Spacing</H3>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <IconSymbol name="quote.bubble" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Lyrics Line Spacing</Typography>
              <Muted>Select vertical spacing for lyrics</Muted>
            </View>
          </View>
          <View style={styles.chipContainer}>
            {([
              { label: 'Compact', value: 'compact' },
              { label: 'Regular', value: 'regular' },
              { label: 'Spacious', value: 'spacious' }
            ] as const).map((option) => {
              const selected = lyricsSpacing === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setLyricsSpacing(option.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: selected ? colors.primary : colors.border,
                      flex: 1,
                      alignItems: 'center',
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
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
