import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { cacheDirectory, getInfoAsync, deleteAsync, readDirectoryAsync } from 'expo-file-system/legacy';

import { H1, H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useDownloads } from '@/services';

export default function CacheSettingsScreen() {
  const { colors } = useAppTheme();
  const { downloadLocation, downloadedTracks } = useDownloads();
  const router = useRouter();
  const [cacheSize, setCacheSize] = useState<string>('Calculating...');

  const getDirSize = async (dirUri: string): Promise<number> => {
    try {
      const files = await readDirectoryAsync(dirUri);
      let size = 0;
      for (const file of files) {
        const fileUri = `${dirUri}${file}`;
        const info = await getInfoAsync(fileUri);
        if (info.exists) {
          if (info.isDirectory) {
            size += await getDirSize(fileUri.endsWith('/') ? fileUri : `${fileUri}/`);
          } else {
            size += info.size || 0;
          }
        }
      }
      return size;
    } catch {
      return 0;
    }
  };

  const loadCacheSize = async () => {
    try {
      const dir = cacheDirectory;
      if (!dir) {
        setCacheSize('0.00 MB');
        return;
      }
      const sizeBytes = await getDirSize(dir);
      const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);
      setCacheSize(`${sizeMB} MB`);
    } catch {
      setCacheSize('0.00 MB');
    }
  };

  useEffect(() => {
    loadCacheSize();
  }, []);

  const handleClearCache = async () => {
    const dir = cacheDirectory;
    if (!dir) return;
    
    const proceedClear = async () => {
      try {
        setCacheSize('Clearing...');
        const files = await readDirectoryAsync(dir);
        for (const file of files) {
          await deleteAsync(`${dir}${file}`, { idempotent: true });
        }
        Alert.alert('Success', 'App cache files cleared successfully!');
        loadCacheSize();
      } catch (e) {
        console.warn('Failed to clear cache', e);
        Alert.alert('Error', 'Failed to clear cache files.');
        loadCacheSize();
      }
    };

    if (downloadLocation === 'cache' && downloadedTracks.length > 0) {
      Alert.alert(
        'Warning',
        'Your download storage is set to "Temporary Cache". Clearing the cache will delete all your offline downloaded songs. Do you still want to proceed?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => loadCacheSize() },
          { text: 'Clear Anyway', style: 'destructive', onPress: proceedClear }
        ]
      );
    } else {
      Alert.alert(
        'Clear Cache',
        'Clear all temporary images, metadata, and stream cache files from this device?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Clear Cache', style: 'destructive', onPress: proceedClear }
        ]
      );
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Cache' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Cache Details Card */}
        <H3 style={styles.sectionTitle}>App Cache</H3>
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <Feather name="database" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Temporary Files Size</Typography>
              <Muted>Image preloads, logs, and temp player files</Muted>
            </View>
            <Typography style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginRight: 8 }}>
              {cacheSize}
            </Typography>
          </View>
          
          <Pressable
            onPress={handleClearCache}
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
              Clear Temporary App Cache
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
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
});
