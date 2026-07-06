import React, { useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Text, Platform, Modal } from 'react-native';
import { Stack } from 'expo-router';
import { Folder, Trash2, Check, ChevronRight, Sliders } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as FileSystem from 'expo-file-system/legacy';

import { H3, Muted, Typography } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BunnyCard } from '@/components/ui/bunny-card';
import { useDownloads } from '@/services';
import { useToast } from '@/components/ui/toast';
import { Alert } from '@/components/ui/alert';

const downloadLocationOptions = [
  { label: 'Internal Storage', value: 'internal' },
  { label: 'Temporary Cache', value: 'cache' },
] as const;

export default function DownloadsSettingsScreen() {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const {
    downloadLocation,
    changeDownloadLocation,
    clearDownloads,
    downloadedTracks,
    concurrentLimit,
    changeConcurrentLimit,
    downloadingIds,
    pausedDownloadingIds,
    exportDownloads
  } = useDownloads();
  const { toast } = useToast();

  const totalDownloadsSize = useMemo(() => {
    const totalBytes = downloadedTracks.reduce((acc, curr) => acc + (curr.size || 0), 0);
    if (totalBytes === 0) return '0 MB';
    const gb = totalBytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return gb.toFixed(2) + ' GB';
    }
    const mb = totalBytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  }, [downloadedTracks]);

  const [promptVisible, setPromptVisible] = useState(false);
  const [lyricsPromptVisible, setLyricsPromptVisible] = useState(false);
  const [duplicatesPromptVisible, setDuplicatesPromptVisible] = useState(false);
  const [exportProgressVisible, setExportProgressVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const [selectedDirectoryUri, setSelectedDirectoryUri] = useState('');
  const [embedLyricsPreference, setEmbedLyricsPreference] = useState(true);
  const [duplicateTracks, setDuplicateTracks] = useState<string[]>([]);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, title: '' });

  const locationSheetRef = useRef<BottomSheetModal>(null);
  const limitSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['30%'], []);
  const limitSnapPoints = useMemo(() => ['45%'], []);

  const currentLocationLabel = downloadLocationOptions.find((o) => o.value === downloadLocation)?.label ?? 'Internal Storage';

  const handleClearAll = () => {
    if (downloadedTracks.length === 0) {
      toast({ title: 'Info', description: 'You have no offline downloaded songs.', type: 'info' });
      return;
    }
    setPromptVisible(true);
  };

  const confirmClear = async () => {
    await clearDownloads();
    toast({ title: 'Success', description: 'All downloaded media tracks deleted.', type: 'success' });
  };

  const handleExportPress = () => {
    if (isExporting) {
      toast({ title: 'Export', description: 'Export is already in progress.', type: 'info' });
      return;
    }
    if (downloadedTracks.length === 0) {
      toast({ title: 'Info', description: 'You have no offline downloaded songs to export.', type: 'info' });
      return;
    }
    if (Platform.OS !== 'android') {
      toast({ title: 'Export', description: 'Exporting to local folders is currently only supported on Android.', type: 'error' });
      return;
    }
    setLyricsPromptVisible(true);
  };

  const handleLyricsPreference = async (embed: boolean) => {
    setLyricsPromptVisible(false);
    setEmbedLyricsPreference(embed);
    setIsExporting(true);
    
    try {
      toast({ title: 'Export', description: 'Please select a destination folder.', type: 'info' });
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        toast({ title: 'Export', description: 'Folder permission denied.', type: 'error' });
        setIsExporting(false);
        return;
      }
      
      const directoryUri = permissions.directoryUri;
      setSelectedDirectoryUri(directoryUri);
      
      const { checkExportDuplicates } = require('@/services');
      const duplicates = await checkExportDuplicates(directoryUri);
      
      if (duplicates.length > 0) {
        setDuplicateTracks(duplicates);
        setDuplicatesPromptVisible(true);
      } else {
        await runExport('skip', embed, directoryUri);
      }
    } catch (err) {
      console.error('Failed to initialize export picker', err);
      toast({ title: 'Export', description: 'Failed to open directory picker.', type: 'error' });
      setIsExporting(false);
    }
  };

  const runExport = async (overwriteMode: 'overwrite' | 'skip', embed: boolean, dirUri: string) => {
    setDuplicatesPromptVisible(false);
    setExportProgressVisible(true);
    setExportProgress({ current: 0, total: downloadedTracks.length, title: '' });
    
    try {
      await exportDownloads(dirUri, {
        overwriteMode,
        embedLyrics: embed,
        onProgress: (current: number, total: number, title: string) => {
          setExportProgress({ current, total, title });
        }
      });
    } catch (err) {
      console.error('Export execution failed', err);
      toast({ title: 'Export', description: 'Failed to export songs.', type: 'error' });
    } finally {
      setExportProgressVisible(false);
      setIsExporting(false);
    }
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
      <Stack.Screen options={{ title: 'Downloads' }} />
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* Save location preferences */}
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Downloads</Text>
       
        <Pressable onPress={() => locationSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Folder size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Save Location</Typography>
                <Muted>Select directory to download audio files</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {currentLocationLabel.split(' ')[0]}
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>

        {/* Parallel downloads limit preference */}
        <Pressable onPress={() => limitSheetRef.current?.present()}>
          <BunnyCard style={styles.navCard}>
            <View style={styles.navSettingRow}>
              <View style={styles.iconContainer}>
                <Sliders size={20} color={colors.primary} />
              </View>
              <View style={styles.settingInfo}>
                <Typography variant="large">Parallel Downloads</Typography>
                <Muted>Adjust number of concurrent download slots</Muted>
              </View>
              <View style={styles.rightContainer}>
                <Typography style={[styles.selectedValue, { color: colors.mutedForeground }]}>
                  {concurrentLimit} slots
                </Typography>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </View>
            </View>
          </BunnyCard>
        </Pressable>

        {/* Download Statistics & Details */}
        <H3 style={styles.sectionTitle}>Details</H3>
        <BunnyCard style={styles.navCard}>
          <View style={styles.statRow}>
            <Typography style={{ color: colors.mutedForeground, fontSize: 15 }}>Total Downloaded Tracks</Typography>
            <Typography style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{downloadedTracks.length} tracks</Typography>
          </View>
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <Typography style={{ color: colors.mutedForeground, fontSize: 15 }}>Total Storage Used</Typography>
            <Typography style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{totalDownloadsSize}</Typography>
          </View>
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <Typography style={{ color: colors.mutedForeground, fontSize: 15 }}>Active Parallel Downloads</Typography>
            <Typography style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>
              {Object.keys(downloadingIds).filter(id => !pausedDownloadingIds[id]).length} active
            </Typography>
          </View>
          <View style={[styles.statRow, { marginTop: 12 }]}>
            <Typography style={{ color: colors.mutedForeground, fontSize: 15 }}>Parallel Limit Configuration</Typography>
            <Typography style={{ fontWeight: '700', color: colors.text, fontSize: 15 }}>{concurrentLimit} tracks max</Typography>
          </View>
        </BunnyCard>

        {/* Storage Management cleanup */}
        <H3 style={styles.sectionTitle}>Storage Management</H3>
        <BunnyCard style={styles.navCard}>
          <View style={styles.navSettingRow}>
            <View style={styles.iconContainer}>
              <Folder size={20} color={colors.primary} />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Export Downloads</Typography>
              <Muted>Export offline tracks & lyrics to a local folder</Muted>
            </View>
          </View>
          
          <Pressable
            onPress={handleExportPress}
            style={[
              styles.chip,
              {
                backgroundColor: 'rgba(76, 217, 100, 0.1)',
                borderColor: '#4CD964',
                alignItems: 'center',
                marginTop: 12,
                marginBottom: 12,
              },
            ]}>
            <Typography
              style={{
                color: '#4CD964',
                fontSize: 14,
                fontWeight: '700',
              }}>
              Export Tracks to Folder
            </Typography>
          </Pressable>

          <View style={[styles.navSettingRow, { borderTopWidth: 0.5, borderTopColor: colors.border, paddingTop: 12 }]}>
            <View style={styles.iconContainer}>
              <Trash2 size={20} color="#FF3B30" />
            </View>
            <View style={styles.settingInfo}>
              <Typography variant="large">Clear Downloads</Typography>
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
                marginTop: 12,
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

      {/* ─── Save Location Bottom Sheet ─── */}
      <BottomSheetModal
        ref={locationSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Save Location</Typography>
          </View>
          {downloadLocationOptions.map((item, index) => {
            const selected = downloadLocation === item.value;
            return (
              <Pressable
                key={item.value}
                onPress={() => {
                  changeDownloadLocation(item.value);
                  locationSheetRef.current?.dismiss();
                }}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < downloadLocationOptions.length - 1 ? 0.5 : 0 },
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

      {/* ─── Concurrent Limit Bottom Sheet ─── */}
      <BottomSheetModal
        ref={limitSheetRef}
        snapPoints={limitSnapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: isDark ? '#151517' : '#F2F2F7' }}
        handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      >
        <BottomSheetView style={styles.sheetContent}>
          <View style={styles.sheetHeader}>
            <Typography style={styles.sheetTitle}>Select Parallel Limit</Typography>
          </View>
          {[1, 2, 3, 4, 5].map((item, index) => {
            const selected = concurrentLimit === item;
            return (
              <Pressable
                key={item}
                onPress={() => {
                  changeConcurrentLimit(item);
                  limitSheetRef.current?.dismiss();
                }}
                style={[
                  styles.sheetOptionRow,
                  { borderBottomColor: colors.border, borderBottomWidth: index < 4 ? 0.5 : 0 },
                  selected && { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Typography style={[styles.optionLabel, selected && { color: colors.primary, fontWeight: '700' }]}>
                  {item} Parallel {item === 1 ? 'Download' : 'Downloads'}
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
        title="Clear Downloads"
        description={`Delete all ${downloadedTracks.length} offline downloaded songs from this device?`}
        confirmText="Delete All"
        cancelText="Cancel"
        onConfirm={confirmClear}
        variant="destructive"
      />

      {/* Lyrics Export Preference Alert */}
      <Alert
        visible={lyricsPromptVisible}
        onClose={() => setLyricsPromptVisible(false)}
        title="Lyrics Format"
        description="Would you like to embed lyrics directly inside the audio files (metadata) or export them as separate .lrc files alongside the songs?"
        confirmText="Embed in Audio"
        cancelText="Separate Files"
        onConfirm={() => handleLyricsPreference(true)}
        onCancel={() => handleLyricsPreference(false)}
      />

      {/* Duplicates Found Alert */}
      <Alert
        visible={duplicatesPromptVisible}
        onClose={() => runExport('skip', embedLyricsPreference, selectedDirectoryUri)}
        title="Duplicate Files Found"
        description={`${duplicateTracks.length} of your tracks already exist in the destination folder. Do you want to overwrite them or skip them?`}
        confirmText="Overwrite"
        cancelText="Skip"
        onConfirm={() => runExport('overwrite', embedLyricsPreference, selectedDirectoryUri)}
      />

      {/* Export Progress Modal Overlay */}
      <Modal transparent visible={exportProgressVisible} animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border, alignItems: 'center' }]}>
            <Typography style={{ fontSize: 20, fontWeight: '700', marginBottom: 12, color: colors.text }}>
              Exporting Tracks
            </Typography>
            <Typography style={{ fontSize: 14, color: colors.mutedForeground, textAlign: 'center', marginBottom: 8 }}>
              Copying files to selected folder...
            </Typography>
            <Typography style={{ fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center', marginVertical: 12 }}>
              {exportProgress.current} of {exportProgress.total}
            </Typography>
            <Typography style={{ fontSize: 13, color: colors.primary, textAlign: 'center', fontWeight: '500' }} numberOfLines={1}>
              {exportProgress.title}
            </Typography>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
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
  navCard: { marginBottom: 12 },
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
  settingInfo: { flex: 1 },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectedValue: { fontSize: 14, marginRight: 4 },
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
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  floatingTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
});
