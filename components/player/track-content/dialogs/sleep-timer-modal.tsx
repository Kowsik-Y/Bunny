import React from 'react';
import { View, Pressable } from 'react-native';
import { Clock, Check } from 'lucide-react-native';
import { Typography as Text } from '@/components/ui/typography';
import { addAlpha } from '@/constants/theme';
import { BottomSheetScrollView } from '../../SwipeBottomSheet';
import { useAppTheme } from '@/contexts/app-theme-context';
import { PlayerSheet } from './player-sheet';
import { useSleepTimer } from '@/services/sleepTimer';

interface SleepTimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SleepTimerModal({ visible, onClose }: SleepTimerModalProps) {
  const { colors } = useAppTheme();
  const { secondsRemaining, stopAtTrackEnd, startTimer, startAtEnd, cancelTimer } = useSleepTimer();

  const options = [
    { label: '5 minutes', value: 5, action: () => startTimer(5) },
    { label: '15 minutes', value: 15, action: () => startTimer(15) },
    { label: '30 minutes', value: 30, action: () => startTimer(30) },
    { label: '45 minutes', value: 45, action: () => startTimer(45) },
    { label: '60 minutes', value: 60, action: () => startTimer(60) },
    { label: 'End of Track', value: 'end', action: startAtEnd },
  ];

  const formatRemainingTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs}s`;
  };

  const isTimerActive = secondsRemaining !== null;

  return (
    <PlayerSheet visible={visible} onClose={onClose} title="Sleep Timer">
      <BottomSheetScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
        {isTimerActive && (
          <View style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, backgroundColor: addAlpha(colors.primary, 0.08), borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
              Timer Active: {formatRemainingTime(secondsRemaining)} remaining
            </Text>
          </View>
        )}

        {stopAtTrackEnd && (
          <View style={{ paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, backgroundColor: addAlpha(colors.primary, 0.08), borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '700' }}>
              Timer Active: Will stop at end of current track
            </Text>
          </View>
        )}

        {options.map((option, idx) => {
          const isSelected = option.value === 'end' 
            ? stopAtTrackEnd 
            : (isTimerActive && Math.round(secondsRemaining / 60) === option.value);

          return (
            <Pressable
              key={idx}
              android_ripple={{ color: colors.border }}
              onPress={() => {
                option.action();
                onClose();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                paddingHorizontal: 16,
                backgroundColor: isSelected ? addAlpha(colors.primary, 0.08) : 'transparent',
                borderRadius: 8,
                marginBottom: 4,
              }}
            >
              <Text style={{ color: isSelected ? colors.primary : colors.text, fontSize: 15, fontWeight: isSelected ? '700' : '400' }}>
                {option.label}
              </Text>
              {isSelected && (
                <Check size={16} color={colors.primary} />
              )}
            </Pressable>
          );
        })}

        {(isTimerActive || stopAtTrackEnd) && (
          <Pressable
            android_ripple={{ color: colors.border }}
            onPress={() => {
              cancelTimer();
              onClose();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              paddingHorizontal: 16,
              marginTop: 12,
              backgroundColor: addAlpha('#FF3B30', 0.1),
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FF3B30', fontSize: 15, fontWeight: '700' }}>
              Turn Off Timer
            </Text>
          </Pressable>
        )}
      </BottomSheetScrollView>
    </PlayerSheet>
  );
}
