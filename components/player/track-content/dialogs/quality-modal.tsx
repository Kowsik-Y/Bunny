import React from 'react';
import { View, Pressable } from 'react-native';
import { AudioLines, Check } from 'lucide-react-native';
import { Typography as Text } from '@/components/ui/typography';
import { addAlpha } from '@/constants/theme';
import { BottomSheetScrollView } from '../../SwipeBottomSheet';
import { useAppTheme } from '@/contexts/app-theme-context';
import { type AppTrack } from '../../Tracks';
import { PlayerSheet } from './player-sheet';

interface QualityModalProps {
  visible: boolean;
  onClose: () => void;
  track: AppTrack;
  playerMode: 'audio' | 'video';
  isLive: boolean;
  changeAudioQuality: (url: string, itag: number) => void;
  changeVideoQuality: (url: string, itag: number) => void;
}

export function QualityModal({
  visible,
  onClose,
  track,
  playerMode,
  isLive,
  changeAudioQuality,
  changeVideoQuality,
}: QualityModalProps) {
  const { colors } = useAppTheme();

  return (
    <PlayerSheet
      visible={visible}
      onClose={onClose}
      title={playerMode === 'video' ? 'Video Quality' : 'Audio Quality'}
    >
      <BottomSheetScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
        {isLive ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <AudioLines size={32} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700' }}>Live Stream Active</Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
              Broadcasting Live • 128 kbps (MP3)
            </Text>
          </View>
        ) : (() => {
          const formats = playerMode === 'video' ? track.allVideo : track.allAudio;
          if (formats && formats.length > 0) {
            return formats.map((format: any, idx: number) => {
              const isSelected = playerMode === 'video'
                ? track.activeVideoItag === format.itag
                : track.activeItag === format.itag;

              const label = playerMode === 'video'
                ? `${format.quality || 'Standard'} (${(format.bitrate / 1000).toFixed(0)} kbps)`
                : (() => {
                  const kbps = (format.bitrate / 1000).toFixed(0);
                  const codec = format.mimeType.split('codecs="')[1]?.split('"')[0]?.toUpperCase() || 'AAC';
                  return `${codec} • ${kbps} kbps`;
                })();

              return (
                <Pressable
                  key={format.itag || idx}
                  android_ripple={{ color: colors.border }}
                  onPress={() => {
                    onClose();
                    const formatUrl = format.url + `&__ua=${encodeURIComponent(track.userAgent || 'Mozilla/5.0')}`;
                    if (playerMode === 'video') {
                      changeVideoQuality(formatUrl, format.itag);
                    } else {
                      changeAudioQuality(formatUrl, format.itag);
                    }
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    backgroundColor: isSelected ? addAlpha(colors.primary, 0.08) : 'transparent',
                    borderRadius: 8,
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ color: isSelected ? colors.primary : colors.text, fontSize: 14, fontWeight: isSelected ? '700' : '400' }}>
                    {label}
                  </Text>
                  {isSelected && (
                    <Check size={16} color={colors.primary} />
                  )}
                </Pressable>
              );
            });
          } else {
            return (
              <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
                  {playerMode === 'video' ? 'Standard Video Quality' : 'Standard Quality (128 kbps)'}
                </Text>
              </View>
            );
          }
        })()}
      </BottomSheetScrollView>
    </PlayerSheet>
  );
}
