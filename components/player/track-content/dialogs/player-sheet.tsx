import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Typography as Text } from '@/components/ui/typography';
import { SwipeBottomSheet } from '../../SwipeBottomSheet';

interface PlayerSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  colors: {
    text: string;
    background: string;
    card: string;
    border: string;
    mutedForeground: string;
    primary: string;
  };
  children: React.ReactNode;
}

export function PlayerSheet({
  visible,
  onClose,
  title,
  showBack,
  onBack,
  colors,
  children,
}: PlayerSheetProps) {
  return (
    <SwipeBottomSheet
      visible={visible}
      onClose={onClose}
      backgroundColor={colors.card}
    >
      {title && (
        <View style={styles.header}>
          {showBack && (
            <Pressable onPress={onBack} style={styles.backBtn}>
              <Feather name="chevron-left" size={22} color={colors.text} />
            </Pressable>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
      )}
      {children}
    </SwipeBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    width: '100%',
    paddingVertical: 10,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
