import React, { useState } from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { usePlaylists } from '@/services';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { SwipeBottomSheet } from '@/components/player/SwipeBottomSheet';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreateSuccess?: (playlist: { id: string; name: string }) => void | Promise<void>;
  buttonText?: string;
};

export function CreatePlaylistBottomSheet({
  visible,
  onClose,
  onCreateSuccess,
  buttonText = 'Create',
}: Props) {
  const { colors } = useAppTheme();
  const { createPlaylist } = usePlaylists();
  const [playlistName, setPlaylistName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = playlistName.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const newPlaylist = await createPlaylist(trimmed);
      setPlaylistName('');
      onClose();
      if (onCreateSuccess && newPlaylist) {
        await onCreateSuccess(newPlaylist);
      }
    } catch (e) {
      console.warn('Failed to create playlist:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SwipeBottomSheet
      visible={visible}
      onClose={() => {
        setPlaylistName('');
        onClose();
      }}
      backgroundColor={colors.background}
    >
      <Text style={[styles.modalTitle, { color: colors.text }]}>
        Create New Playlist
      </Text>
      <View style={styles.inputContainer}>
        <BottomSheetTextInput
          value={playlistName}
          onChangeText={setPlaylistName}
          placeholder="Playlist name"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
        />
      </View>
      <Pressable
        android_ripple={{
          color: colors.border,
          borderless: false,
          foreground: true,
        }}
        onPress={handleCreate}
        disabled={loading}
        style={[styles.createBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.createBtnText, { color: colors.background }]}>
          {loading ? 'Creating...' : buttonText}
        </Text>
      </Pressable>
    </SwipeBottomSheet>
  );
}

const styles = StyleSheet.create({
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginVertical: 20,
  },
  textInput: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  createBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
