import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Database } from 'lucide-react-native';
import { cacheDirectory, getInfoAsync, deleteAsync, readDirectoryAsync } from 'expo-file-system/legacy';
import { useToast } from '@/components/ui/toast';
import { Alert } from '@/components/ui/alert';

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
  const { toast } = useToast();

  const [cacheSize, setCacheSize] = useState<string>('Calculating...');
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptDescription, setPromptDescription] = useState('');

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

  const proceedClear = async () => {
    const dir = cacheDirectory;
    if (!dir) return;
    try {
      setCacheSize('Clearing...');
      const files = await readDirectoryAsync(dir);
      for (const file of files) {
        await deleteAsync(`${dir}${file}`, { idempotent: true });
      }
      toast({ title: 'Success', description: 'App cache files cleared successfully!', type: 'success' });
      loadCacheSize();
    } catch (e) {
      console.warn('Failed to clear cache', e);
      toast({ title: 'Error', description: 'Failed to clear cache files.', type: 'error' });
      loadCacheSize();
    }
  };

  const handleClearCache = () => {
    const dir = cacheDirectory;
    if (!dir) return;

    if (downloadLocation === 'cache' && downloadedTracks.length > 0) {
      setPromptTitle('Warning');
      setPromptDescription('Your download storage is set to "Temporary Cache". Clearing the cache will delete all your offline downloaded songs. Do you still want to proceed?');
    } else {
      setPromptTitle('Clear Cache');
      setPromptDescription('Clear all temporary images, metadata, and stream cache files from this device?');
    }
    setPromptVisible(true);
  };

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Cache' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Cache Details Card */}
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Cache</Text>
       
        <BunnyCard style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.iconContainer}>
              <Database size={20} color={colors.primary} />
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

      <Alert
        visible={promptVisible}
        onClose={() => setPromptVisible(false)}
        title={promptTitle}
        description={promptDescription}
        confirmText="Clear anyway"
        cancelText="Cancel"
        onConfirm={proceedClear}
        variant="destructive"
      />
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
    paddingTop: 100,
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
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
});
