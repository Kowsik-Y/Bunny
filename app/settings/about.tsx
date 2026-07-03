import React from 'react';
import { StyleSheet, View, ScrollView, Pressable, Platform, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Github, ChevronRight } from 'lucide-react-native';

import { H1, H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import packageJson from '../../package.json';

export default function AboutSettingsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'About' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <BunnyCard style={styles.settingCard}>
          <View style={{ alignItems: 'center', marginVertical: 16 }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Image source={require('@/assets/images/logo.png')} style={{ width: 80, height: 80 }} />
            </View>
            <H3 style={{ fontWeight: '800' }}>Bunny</H3>
            <Muted>Elegant Music Player</Muted>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography style={{ color: colors.mutedForeground }}>Version</Typography>
              <Typography style={{ fontWeight: '600' }}>{packageJson.version}</Typography>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography style={{ color: colors.mutedForeground }}>Type</Typography>
              <Typography style={{ fontWeight: '600' }}>{__DEV__ ? 'Debug Build' : 'Release Build'}</Typography>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography style={{ color: colors.mutedForeground }}>Architecture</Typography>
              <Typography style={{ fontWeight: '600' }}>{Platform.OS === 'android' ? 'arm64-v8a' : 'Universal'}</Typography>
            </View>
          </View>
        </BunnyCard>

        <H3 style={styles.sectionTitle}>Links & Resources</H3>
        <BunnyCard style={styles.settingCard}>
          <Pressable onPress={() => Linking.openURL('https://github.com/Kowsik-Y')} style={[styles.settingRow, { marginBottom: 0 }]}>
            <View style={styles.iconContainer}>
              <Github size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">GitHub Profile</Typography>
              <Muted>Check out the developer profile</Muted>
            </View>
            <ChevronRight size={20} color={colors.mutedForeground} />
          </Pressable>
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
});
