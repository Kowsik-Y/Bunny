import React from 'react';
import { Pressable } from 'react-native';
import { Typography as Text } from '@/components/ui/typography';
import { BottomSheetScrollView, SwipeBottomSheet } from '../../SwipeBottomSheet';
import { styles } from '../styles';

interface ArtistSheetProps {
  visible: boolean;
  onClose: () => void;
  artistOptions: Array<{ name: string; id: string }>;
  onSelectArtist: (id: string) => void;
  colors: any;
}

export function ArtistSheet({
  visible,
  onClose,
  artistOptions,
  onSelectArtist,
  colors,
}: ArtistSheetProps) {
  return (
    <SwipeBottomSheet visible={visible} onClose={onClose}>
      <Text variant="large" style={{ fontWeight: '800', textAlign: 'center', marginBottom: 16, marginTop: 10 }}>
        Select Artist
      </Text>
      <BottomSheetScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
        {artistOptions.map((art) => (
          <Pressable
            key={art.id}
            onPress={() => {
              onClose();
              onSelectArtist(art.id);
            }}
            style={{
              paddingVertical: 14,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 16 }}>{art.name}</Text>
          </Pressable>
        ))}
      </BottomSheetScrollView>
    </SwipeBottomSheet>
  );
}
