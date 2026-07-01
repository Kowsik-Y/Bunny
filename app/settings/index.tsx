import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { H1, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function SettingsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <View style={{ gap: 4 }}>
          {/* Appearance Row */}
          <Pressable onPress={() => router.push('/settings/appearance')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <IconSymbol name="paintbrush.fill" size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Appearance</Typography>
                  <Muted>Choose app theme, accent colors, and fonts</Muted>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* Player & Lyrics Row */}
          <Pressable onPress={() => router.push('/settings/lyrics')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <IconSymbol name="play.fill" size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Player & Lyrics</Typography>
                  <Muted>Customize player background and lyric sizing</Muted>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* Playback & Audio Row */}
          <Pressable onPress={() => router.push('/settings/audio')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <IconSymbol name="antenna.radiowaves.left.and.right" size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Playback & Audio</Typography>
                  <Muted>Set sound streaming quality presets</Muted>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* Downloads Row */}
          <Pressable onPress={() => router.push('/settings/downloads')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Feather name="download" size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Downloads</Typography>
                  <Muted>Download location and offline library cleanup</Muted>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* Cache Management Row */}
          <Pressable onPress={() => router.push('/settings/cache')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Feather name="database" size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Cache Management</Typography>
                  <Muted>Free up space by cleaning temporary cache files</Muted>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* App Updates Row */}
          <Pressable onPress={() => router.push('/settings/updates')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Feather name="refresh-cw" size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">App Updates</Typography>
                  <Muted>Check for updates and manage auto-updates</Muted>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* About Row */}
          <Pressable onPress={() => router.push('/settings/about')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Feather name="info" size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">About</Typography>
                  <Muted>Developer details, version, and resources</Muted>
                </View>
                <IconSymbol name="chevron.right" size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>
        </View>
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
  navCard: {
    marginBottom: 12,
  },
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
  settingInfo: {
    flex: 1,
  },
});
