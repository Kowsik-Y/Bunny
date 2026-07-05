import React from 'react';
import { View, Image, TouchableOpacity, Linking } from 'react-native';
import { Typography as Text } from '@/components/ui/typography';
import { addAlpha } from '@/constants/theme';
import { BottomSheetScrollView } from '../../SwipeBottomSheet';
import { useAppTheme } from '@/contexts/app-theme-context';
import { type AppTrack } from '../../Tracks';
import { PlayerSheet } from './player-sheet';
import { styles } from '../styles';

interface AboutModalProps {
  visible: boolean;
  onClose: () => void;
  track: AppTrack;
  isLive: boolean;
  handleArtistPress: () => void;
}

export function AboutModal({
  visible,
  onClose,
  track,
  isLive,
  handleArtistPress,
}: AboutModalProps) {
  const { colors } = useAppTheme();

  return (
    <PlayerSheet
      visible={visible}
      onClose={onClose}
      title="Song Info"
    >
      <BottomSheetScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
        {isLive && track.artwork && (
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <Image
              source={{ uri: track.artwork as string }}
              style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' }}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={{ backgroundColor: addAlpha(colors.text, 0.04), borderRadius: 12, padding: 14, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Title</Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '70%' }} numberOfLines={1}>{track.title}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Artist</Text>
            <TouchableOpacity
              onPress={() => { onClose(); handleArtistPress(); }}
              disabled={isLive}
            >
              <Text style={[
                { color: colors.primary, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
                isLive && { color: colors.text, textDecorationLine: 'none' }
              ]}>
                {track.artist}
              </Text>
            </TouchableOpacity>
          </View>
          {track.album && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Album</Text>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '70%' }} numberOfLines={1}>{track.album}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Provider</Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
              {track.album === 'Radio Garden' || track.id?.startsWith('radiogarden-') ? 'Radio Garden' : 'YouTube Music'}
            </Text>
          </View>
          {track.website && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, alignItems: 'center' }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Website</Text>
              <TouchableOpacity onPress={() => Linking.openURL(track.website!)}>
                <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline', maxWidth: 200 }} numberOfLines={1}>
                  {track.website}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {track.streamHost && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Stream Host</Text>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', maxWidth: '75%' }} numberOfLines={1}>
                {track.streamHost}
              </Text>
            </View>
          )}
        </View>
      </BottomSheetScrollView>
    </PlayerSheet>
  );
}
