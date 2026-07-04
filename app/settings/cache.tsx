import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Database, Check, ChevronRight, Sliders, Settings } from 'lucide-react-native';
import { cacheDirectory, getInfoAsync, deleteAsync, readDirectoryAsync } from 'expo-file-system/legacy';
import { useToast } from '@/components/ui/toast';
import { Alert } from '@/components/ui/alert';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import { H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { useDownloads } from '@/services';
import { Slider } from '@/components/ui/slider';

const autoClearOptions = [
  { label: 'Auto-clear oldest files', value: true },
  { label: 'Disabled (Manual only)', value: false },
] as const;

export default function CacheSettingsScreen() {
  const {
    colors,
    colorScheme,
    maxCacheSize,
    setMaxCacheSize,
    autoClearCache,
    setAutoClearCache,
  } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const { downloadLocation, downloadedTracks } = useDownloads();
  const { toast } = useToast();

  const [cacheSize, setCacheSize] = useState<string>('Calculating...');
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptDescription, setPromptDescription] = useState('');

  const autoClearSheetRef = useRef<BottomSheetModal>(null);
  const autoClearSnapPoints = useMemo(() => ['28%'], []);

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

  const autoPruneCache = async (maxSizeMB: number) => {
    const dir = cacheDirectory;
    if (!dir) return;
    try {
      const files = await readDirectoryAsync(dir);
      let cacheFiles: { uri: string; size: number; mtime: number }[] = [];
      let totalSize = 0;

      for (const file of files) {
        const fileUri = `${dir}${file}`;
        const info = await getInfoAsync(fileUri);
        if (info.exists && !info.isDirectory) {
          cacheFiles.push({
            uri: fileUri,
            size: info.size || 0,
            mtime: info.modificationTime || Date.now(),
          });
          totalSize += info.size || 0;
        }
      }

      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (totalSize > maxSizeBytes) {
        // Sort oldest first (modificationTime ascending)
        cacheFiles.sort((a, b) => a.mtime - b.mtime);

        for (const f of cacheFiles) {
          if (totalSize <= maxSizeBytes) break;
          await deleteAsync(f.uri, { idempotent: true });
          totalSize -= f.size;
        }
        toast({ title: 'Cache Auto-Cleaned', description: `Oldest cache files evicted to fit ${formatSize(maxSizeMB)} limit.`, type: 'info' });
      }
    } catch (err) {
      console.warn('[CacheSettings] Auto-pruning failed:', err);
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
    const runCacheCleanup = async () => {
      if (autoClearCache) {
        await autoPruneCache(maxCacheSize);
      }
      await loadCacheSize();
    };
    runCacheCleanup();
  }, [maxCacheSize, autoClearCache]);

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

  const formatSize = (mb: number) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
      />
    ),
    []
  );

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Cache' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Cache</Text>
       
        {/* Cache Size Info & Clear */}
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

        {/* Auto Clear Preference Picker */}
        <Pressable onPress={() => autoClearSheetRef.current?.present()}>
          <BunnyCard style={styles.settingCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Settings size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Auto-Clear Cache Policy</Typography>
                <Muted>Prune cache automatically when limit is hit</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {autoClearCache ? 'Auto-Prune' : 'Disabled'}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>

        {/* Cache Size Limit Slider Card */}
        {autoClearCache && (
          <BunnyCard style={styles.settingCard}>
            <View style={styles.sliderHeaderRow}>
              <View style={styles.iconContainer}>
                <Sliders size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Cache Storage Limit</Typography>
                <Muted>Configure max cache threshold</Muted>
              </View>
              <Typography style={{ fontSize: 16, fontWeight: '700', color: colors.primary, marginRight: 8 }}>
                {formatSize(maxCacheSize)}
              </Typography>
            </View>

            <View style={styles.sliderContainer}>
              <Slider
                value={maxCacheSize}
                min={500}
                max={5000}
                onValueChange={(val) => setMaxCacheSize(Math.round(val / 250) * 250)}
                style={{ width: '100%' }}
              />
              <View style={styles.sliderLabels}>
                <Muted style={{ fontSize: 11 }}>500 MB</Muted>
                <Muted style={{ fontSize: 11 }}>2.5 GB</Muted>
                <Muted style={{ fontSize: 11 }}>5.0 GB</Muted>
              </View>
            </View>
          </BunnyCard>
        )}
      </ScrollView>

      {/* Auto-Clear Picker Bottom Sheet */}
      <BottomSheetModal
        ref={autoClearSheetRef}
        snapPoints={autoClearSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Auto-Clear Policy</Typography>
          </View>
          {autoClearOptions.map((item, index) => {
            const selected = autoClearCache === item.value;
            return (
              <Pressable
                key={String(item.value)}
                onPress={() => {
                  setAutoClearCache(item.value);
                  autoClearSheetRef.current?.dismiss();
                }}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < autoClearOptions.length - 1 ? 0.5 : 0 },
                  selected && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Typography style={[styles.optionLabel, selected && { color: colors.primary, fontWeight: '700' }]}>
                  {item.label}
                </Typography>
                {selected && <Check size={18} color={colors.primary} strokeWidth={2.5} />}
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>

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
  screen: { flex: 1 },
  container: {
    paddingHorizontal: 16,
    paddingTop: 100,
    paddingBottom: 40,
  },
  settingCard: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  navSettingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sliderHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedValue: { fontSize: 14, marginRight: 4 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  sliderContainer: {
    paddingHorizontal: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  sheetContent: {
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sheetOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  optionLabel: { fontSize: 16 },
});
