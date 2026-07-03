import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import {
  Paintbrush,
  Play,
  Radio,
  Download,
  Database,
  RefreshCw,
  Info,
  ChevronRight,
} from 'lucide-react-native';

import {  Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { Text } from 'react-native';

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
        {/* Floating title — scrolls with content, sits below the sticky back btn */}
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Settings</Text>
        <View style={{ gap: 4 }}>
          {/* Appearance Row */}
          <Pressable onPress={() => router.push('/settings/appearance')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Paintbrush size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Appearance</Typography>
                  <Muted>Choose app theme, accent colors, and fonts</Muted>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* Player & Lyrics Row */}
          <Pressable onPress={() => router.push('/settings/lyrics')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Play size={20} color={colors.primary} fill={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Player & Lyrics</Typography>
                  <Muted>Customize player background and lyric sizing</Muted>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* Playback & Audio Row */}
          <Pressable onPress={() => router.push('/settings/audio')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Radio size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Playback & Audio</Typography>
                  <Muted>Set sound streaming quality presets</Muted>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* Downloads Row */}
          <Pressable onPress={() => router.push('/settings/downloads')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Download size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Downloads</Typography>
                  <Muted>Download location and offline library cleanup</Muted>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* Cache Management Row */}
          <Pressable onPress={() => router.push('/settings/cache')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Database size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">Cache Management</Typography>
                  <Muted>Free up space by cleaning temporary cache files</Muted>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* App Updates Row */}
          <Pressable onPress={() => router.push('/settings/updates')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <RefreshCw size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">App Updates</Typography>
                  <Muted>Check for updates and manage auto-updates</Muted>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </View>
            </BunnyCard>
          </Pressable>

          {/* About Row */}
          <Pressable onPress={() => router.push('/settings/about')}>
            <BunnyCard style={styles.navCard}>
              <View style={styles.navSettingRow}>
                <View style={styles.iconContainer}>
                  <Info size={20} color={colors.primary} />
                </View>
                <View style={styles.settingInfo}>
                  <Typography variant="large">About</Typography>
                  <Muted>Developer details, version, and resources</Muted>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
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
    paddingTop: 100,   // clears the floating sticky back button
    paddingBottom: 40,
  },
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
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
