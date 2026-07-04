import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { styles } from './styles';

export const ActionRow = ({
  icon,
  label,
  onPress,
  color,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
  last?: boolean;
}) => {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.border }}
      style={[
        styles.actionRow,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.05)' },
      ]}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={[styles.actionText, { color: color ?? colors.text }]}>{label}</Text>
    </Pressable>
  );
};
