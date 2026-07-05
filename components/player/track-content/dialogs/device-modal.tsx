import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Typography as Text } from '@/components/ui/typography';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { type AppTrack } from '../../Tracks';

interface DeviceModalProps {
  deviceSheetRef: React.RefObject<BottomSheetModal | null>;
  activeDevice: string;
  realDevices: any[];
  playerMode: 'audio' | 'video';
  track: AppTrack;
  colors: any;
  renderBackdrop: (props: any) => React.ReactNode;
  onDismiss: () => void;
}

export function DeviceModal({
  deviceSheetRef,
  activeDevice,
  realDevices,
  playerMode,
  track,
  colors,
  renderBackdrop,
  onDismiss,
}: DeviceModalProps) {
  const { colors: themeColors } = useAppTheme();

  return (
    <BottomSheetModal
      ref={deviceSheetRef}
      snapPoints={['60%']}
      enablePanDownToClose={true}
      onDismiss={onDismiss}
      backgroundStyle={{ backgroundColor: colors.background }}
      handleIndicatorStyle={{ backgroundColor: colors.text, opacity: 0.3 }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.content}>
        <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 16 }]}>Audio Status</Text>

        <View style={[
          styles.deviceCard,
          {
            backgroundColor: colors.mutedForeground,
            borderColor: colors.border
          }
        ]}>
          <View style={[
            styles.iconWrap,
            { backgroundColor: addAlpha(colors.primary, 0.1) }
          ]}>
            <Feather
              name={
                activeDevice.toLowerCase().includes('bluetooth')
                  ? 'bluetooth'
                  : activeDevice.toLowerCase().includes('speaker')
                    ? 'volume-2'
                    : 'speaker'
              }
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Output
            </Text>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
              {activeDevice}
            </Text>
          </View>
          <View style={styles.activePill}>
            <View style={styles.dot} />
            <Text style={{ color: '#32D74B', fontSize: 11, fontWeight: '600' }}>Active</Text>
          </View>
        </View>

        {realDevices && realDevices.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
              Available Devices
            </Text>
          </View>
        )}

        <View style={styles.qualityCard}>
          <View style={[
            styles.iconWrap,
            { backgroundColor: addAlpha(colors.primary, 0.1) }
          ]}>
            <MaterialCommunityIcons name="waveform" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Stream Quality
            </Text>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
              {(() => {
                const formats = playerMode === 'video' ? track.allVideo : track.allAudio;
                const activeFormat = formats?.find((format: any) =>
                  playerMode === 'video'
                    ? track.activeVideoItag === format.itag
                    : track.activeItag === format.itag
                );
                if (activeFormat) {
                  if (playerMode === 'video') {
                    return `${activeFormat.quality || 'Standard'} (${(activeFormat.bitrate / 1000).toFixed(0)} kbps)`;
                  } else {
                    const kbps = (activeFormat.bitrate / 1000).toFixed(0);
                    const codec = activeFormat.mimeType.split('codecs="')[1]?.split('"')[0]?.toUpperCase() || 'AAC';
                    return `${codec} • ${kbps} kbps`;
                  }
                }
                return playerMode === 'video' ? 'Standard Video Quality' : 'Standard Quality (128 kbps)';
              })()}
            </Text>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  deviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardSub: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#32D74B',
    marginRight: 6,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  qualityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
});
