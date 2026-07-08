import React from 'react';
import { StyleSheet, View, ScrollView, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Bell, RefreshCw, Download } from 'lucide-react-native';

import { Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { Switch } from '@/components/ui/switch';

export default function NotificationsSettingsScreen() {
  const {
    colors,
    updateNotificationsEnabled,
    setUpdateNotificationsEnabled,
    downloadNotificationsEnabled,
    setDownloadNotificationsEnabled,
  } = useAppTheme();

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Notifications</Text>

        <BunnyCard style={styles.settingCard}>
          {/* Update Notifications Switch */}
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <RefreshCw size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">App Update Alerts</Typography>
              <Muted>Receive system notifications when a new app version is available</Muted>
            </View>
            <Switch
              checked={updateNotificationsEnabled}
              onCheckedChange={setUpdateNotificationsEnabled}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 12 }]} />

          {/* Download Notifications Switch */}
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <Download size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Download Alerts</Typography>
              <Muted>Receive notifications for offline track download progress and completion</Muted>
            </View>
            <Switch
              checked={downloadNotificationsEnabled}
              onCheckedChange={setDownloadNotificationsEnabled}
            />
          </View>
        </BunnyCard>
      </ScrollView>
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
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
