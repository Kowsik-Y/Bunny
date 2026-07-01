import React from 'react';
import { StyleSheet, View, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { H1, H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useDownloads } from '@/services';

export default function DownloadsSettingsScreen() {
  const { colors } = useAppTheme();
  const { downloadLocation, changeDownloadLocation, clearDownloads, downloadedTracks } = useDownloads();
  const router = useRouter();

  const handleClearAll = () => {
    if (downloadedTracks.length === 0) {
      Alert.alert('Info', 'You have no offline downloaded songs.');
      return;
    }
    Alert.alert(
      'Clear Downloads',
      `Delete all ${downloadedTracks.length} offline downloaded songs from this device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await clearDownloads();
            Alert.alert('Success', 'All downloaded media tracks deleted.');
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Downloads' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Storage Location preferences */}
        <H3 style={styles.sectionTitle}>Storage Preferences</H3>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <Feather name="folder" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Save Location</Typography>
              <Muted>Select directory to download audio files</Muted>
            </View>
          </View>
          <View style={styles.chipContainer}>
            {([
              { label: 'Internal Storage', value: 'internal' },
              { label: 'Temporary Cache', value: 'cache' }
            ] as const).map((option) => {
              const selected = downloadLocation === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => changeDownloadLocation(option.value)}
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
                      fontSize: 12,
                    }}>
                    {option.label}
                  </Typography>
                </Pressable>
              );
            })}
          </View>
        </BunnyCard>

        {/* Storage Management cleanup */}
        <H3 style={styles.sectionTitle}>Storage Management</H3>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <Feather name="trash-2" size={20} color="#FF3B30" />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Clear Cache</Typography>
              <Muted>Delete all local offline tracks to free space</Muted>
            </View>
          </View>
          
          <Pressable
            onPress={handleClearAll}
            style={[
              styles.chip,
              {
                backgroundColor: 'rgba(255, 59, 48, 0.1)',
                borderColor: '#FF3B30',
                alignItems: 'center',
                marginTop: 8,
              },
            ]}>
            <Typography
              style={{
                color: '#FF3B30',
                fontSize: 14,
                fontWeight: '700',
              }}>
              Delete All Offline Downloads
            </Typography>
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
