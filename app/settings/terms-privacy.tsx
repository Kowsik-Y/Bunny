import { StyleSheet, View, ScrollView, Text } from 'react-native';
import { Stack } from 'expo-router';
import React, { useState } from 'react';

import { H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { SegmentedControl } from '@/components/ui/segmented-control';

type Tab = 'terms' | 'privacy';

export default function TermsPrivacyScreen() {
  const { colors } = useAppTheme();
  const [activeTab, setActiveTab] = useState<Tab>('terms');

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Terms & Privacy' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Terms & Privacy</Text>

        <SegmentedControl
          options={[
            { value: 'terms', label: 'Terms of Service' },
            { value: 'privacy', label: 'Privacy Policy' },
          ]}
          selectedValue={activeTab}
          onChange={(val) => setActiveTab(val as Tab)}
          style={{ marginBottom: 20 }}
        />

        <BunnyCard style={styles.contentCard}>
          {activeTab === 'terms' ? (
            <View style={styles.sectionContainer}>
              <H3 style={styles.sectionTitle}>Terms of Service</H3>
              <Muted style={styles.lastUpdated}>Last Updated: July 2026</Muted>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>1. Agreement to Terms</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  By installing, opening, or playing audio via the Bunny application, you explicitly agree to be bound by these Terms of Service. If you disagree with any terms, please uninstall the app.
                </Typography>
              </View>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>2. Scope & Description of Service</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  Bunny functions as an offline audio organizer, playlist manager, and client streamer for YouTube Music endpoints. We do not host, store, upload, or own any copyright-protected media content. Audio streams are resolved dynamically on-demand from public YouTube Music URLs.
                </Typography>
              </View>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>3. Compliance & Fair Use</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  You are solely responsible for ensuring that your usage of streaming and offline caching features complies with the YouTube Terms of Service and your regional intellectual property/copyright laws. This application is intended strictly for personal, non-commercial fair-use audio management.
                </Typography>
              </View>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>4. Disclaimer of Warranties</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  Bunny is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We make no warranty that streams will be uninterrupted, that Google APIs will remain unchanged, or that specific YouTube Music catalog files will continue to be resolvable.
                </Typography>
              </View>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>5. Limitation of Liability</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  Under no circumstances shall the developers of Bunny be liable for any direct, indirect, special, or consequential damages resulting from the compilation, installation, media playbacks, or local downloads.
                </Typography>
              </View>
            </View>
          ) : (
            <View style={styles.sectionContainer}>
              <H3 style={styles.sectionTitle}>Privacy Policy</H3>
              <Muted style={styles.lastUpdated}>Last Updated: July 2026</Muted>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>1. Zero Personal Data Collection</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  Your privacy is a core priority. Bunny does not log, collect, track, record, upload, or share your personal credentials, search histories, playback logs, unique device identifiers, or IP addresses.
                </Typography>
              </View>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>2. Strictly Local Storage</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  All user-custom settings (themes, quality selections, notification states), library playlist databases, favorites registries, and downloaded audio tracks are stored exclusively on your device&apos;s internal storage. We maintain no cloud backend or data syncing infrastructure.
                </Typography>
              </View>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>3. YouTube API & Networking</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  Audio streams and metadata queries resolve directly with YouTube server endpoints. Your network interactions with these remote APIs are governed by the Google/YouTube Privacy Policies, which we do not manage or control.
                </Typography>
              </View>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>4. Ads, Telemetry & Trackers</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  This application packages absolutely zero commercial display advertising networks, third-party analytics trackers, crash report telemetry systems, or tracking cookies. You enjoy a clean, fast, and completely private listening environment.
                </Typography>
              </View>

              <View style={styles.paragraph}>
                <Typography style={styles.heading}>5. External Permissions</Typography>
                <Typography style={[styles.bodyText, { color: colors.mutedForeground }]}>
                  - **Storage/File Permissions**: Needed solely to save downloads to directories you select or to scan your device&apos;s local folder path for offline audio playback.
                  - **Network Access**: Used only to communicate with YouTube Music endpoints for metadata searches and audio streams.
                </Typography>
              </View>
            </View>
          )}
        </BunnyCard>
      </ScrollView>
    </ThemedView>
  );
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
  contentCard: {
    paddingVertical: 8,
    borderRadius: 16,
  },
  sectionContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontWeight: '800',
  },
  lastUpdated: {
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
  paragraph: {
    gap: 6,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
