import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { IconSymbol } from './icon-symbol';
import { Typography, Muted } from './typography';
import { addAlpha } from '@/constants/theme';

export interface SongCardProps {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  index?: number;
  showIndex?: boolean;
  showRank?: boolean;
  rightIcon?: 'bullet' | 'play' | 'chevron' | 'none';
  isActive?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
}

export function SongCard({
  title,
  artist,
  album,
  artwork,
  index,
  showIndex = false,
  showRank = false,
  rightIcon = 'bullet',
  isActive = false,
  isPlaying = false,
  onPress,
}: SongCardProps) {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.trackItem,
        isActive && { backgroundColor: addAlpha(colors.accent, 0.12), borderRadius: 14 }
      ]}
    >
      {showRank && typeof index === 'number' && (
        <View style={styles.trackIndexContainer}>
          <Muted style={[styles.trackIndex, isActive && { color: colors.primary, fontWeight: '700' }]}>
            {index + 1}
          </Muted>
        </View>
      )}

      {showIndex && typeof index === 'number' && !showRank ? (
        <View style={styles.trackIndexContainer}>
          <Muted style={[styles.trackIndex, isActive && { color: colors.primary, fontWeight: '700' }]}>
            {index + 1}
          </Muted>
        </View>
      ) : artwork && artwork.trim() !== '' ? (
        <Image source={{ uri: artwork }} style={styles.trackArtwork} />
      ) : (
        <Image source={require('@/assets/images/icon.png')} style={styles.trackArtwork} />
      )}

      <View style={styles.trackInfo}>
        <Typography 
          variant="large" 
          numberOfLines={1} 
          style={isActive ? { color: colors.primary, fontWeight: '700' } : undefined}
        >
          {title}
        </Typography>
        <Muted numberOfLines={1}>
          {artist}{album ? ` • ${album}` : ''}
        </Muted>
      </View>

      {rightIcon === 'bullet' && (
        <IconSymbol name="list.bullet" size={18} color={isActive ? colors.primary : colors.muted} />
      )}
      {rightIcon === 'play' && (
        <IconSymbol name={isActive && isPlaying ? "pause.fill" : "play.fill"} size={16} color={colors.primary} />
      )}
      {rightIcon === 'chevron' && (
        <IconSymbol name="chevron.right" size={20} color={colors.muted} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  trackIndexContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  trackIndex: {
    fontSize: 15,
  },
  trackArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 16,
  },
  placeholderArtwork: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
});
