import React, { useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Text } from 'react-native';
import { Stack } from 'expo-router';
import { Folder, Trash2, Check, ChevronRight } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';

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
  const { downloadLocation, changeDownloadLocation, clearDownloads, downloadedTracks } = useDownloads();
  const { toast } = useToast();

  const [promptVisible, setPromptVisible] = useState(false);

  const locationSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['30%'], []);

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
        {/* Storage Location preferences */}
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

        {/* Storage Management cleanup */}
        <H3 style={styles.sectionTitle}>Storage Management</H3>
        <BunnyCard style={styles.navCard}>
          <View style={styles.navSettingRow}>
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
