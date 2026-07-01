import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Typography } from '@/components/ui/typography';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';

interface TopResultCardProps {
  type: 'song' | 'artist' | 'album' | 'playlist';
  item: {
    id: string;
    name?: string;
    title?: string;
    thumbnail?: string | null;
    artwork?: string | null;
    artist?: string;
    subscribers?: string;
    duration?: number;
    year?: string;
  };
  recommendedSong?: any; // ONLY used for artist type
  onPress: () => void;
  onPlay: () => void;
  onAction?: () => void;
  onRecommendedSongPress?: (song: any) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function TopResultCard({
  type,
  item,
  recommendedSong,
  onPress,
  onPlay,
  onAction,
  onRecommendedSongPress,
}: TopResultCardProps) {
  const { colors } = useAppTheme();

  const isArtist = type === 'artist';
  const isSong = type === 'song';
  const isAlbum = type === 'album' || type === 'playlist';

  const name = isArtist ? item.name : item.title;
  const thumbnail = isArtist ? item.thumbnail : (item.thumbnail || item.artwork);
  
  const subtitle = isArtist
    ? `Artist ${item.subscribers ? `• ${item.subscribers}` : ''}`
    : isSong
    ? `Song • ${item.artist || 'Unknown Artist'} ${item.duration ? `• ${formatDuration(item.duration)}` : ''}`
    : type === 'playlist'
    ? `Playlist • ${item.artist || 'Unknown Artist'}`
    : `Album • ${item.artist || 'Unknown Artist'} ${item.year ? `• ${item.year}` : ''}`;

  const primaryBtnLabel = isArtist ? 'Shuffle' : 'Play';
  const primaryBtnIcon = isArtist ? 'shuffle' : 'play.fill';

  const secondaryBtnLabel = isArtist ? 'Mix' : isSong ? 'Radio' : 'Library';
  const secondaryBtnIcon = isArtist ? 'antenna.radiowaves.left.and.right' : isSong ? 'antenna.radiowaves.left.and.right' : 'list.bullet';

  return (
    <View style={styles.topResultSection}>
      <Typography variant="small" style={styles.sectionLabel}>TOP RESULT</Typography>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.topResultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.topResultHeader}>
          <Image
            source={{ uri: thumbnail || 'https://picsum.photos/200/200' }}
            style={[styles.topResultAvatar, { borderRadius: isArtist ? 32 : 12 }]}
          />
          <View style={styles.topResultDetails}>
            <Typography variant="large" style={[styles.topResultName, { color: colors.text }]} numberOfLines={1}>
              {name}
            </Typography>
            <Typography variant="small" style={{ color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
              {subtitle}
            </Typography>
          </View>
          <IconSymbol name="chevron.right" size={20} color={addAlpha(colors.text, 0.32)} />
        </View>

        <View style={styles.topResultActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPlay}
            style={[styles.actionButton, { backgroundColor: colors.text, flex: 1, marginRight: 8 }]}
          >
            <IconSymbol name={primaryBtnIcon as any} size={16} color={colors.background} />
            <Typography style={[styles.actionButtonText, { color: colors.background, fontWeight: '600', marginLeft: 8 }]}>
              {primaryBtnLabel}
            </Typography>
          </TouchableOpacity>

          {onAction && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onAction}
              style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, flex: 1, marginLeft: 8 }]}
            >
              <IconSymbol name={secondaryBtnIcon as any} size={16} color={colors.text} />
              <Typography style={[styles.actionButtonText, { color: colors.text, fontWeight: '600', marginLeft: 8 }]}>
                {secondaryBtnLabel}
              </Typography>
            </TouchableOpacity>
          )}
        </View>

        {isArtist && recommendedSong && (
          <View style={[styles.songSection, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <Typography variant="small" style={[styles.songSectionLabel, { color: colors.mutedForeground }]}>
              TOP SONG
            </Typography>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onRecommendedSongPress?.(recommendedSong)}
              style={[styles.songRow, { backgroundColor: addAlpha(colors.text, 0.02) }]}
            >
              <Image
                source={{ uri: recommendedSong.thumbnail || 'https://picsum.photos/100/100' }}
                style={styles.songArtwork}
              />
              <View style={styles.songDetails}>
                <Typography style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
                  {recommendedSong.title}
                </Typography>
                <Typography variant="small" style={{ color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                  Song • {recommendedSong.artist}
                </Typography>
              </View>
              <View style={[styles.songPlayButton, { backgroundColor: addAlpha(colors.primary, 0.1) }]}>
                <IconSymbol name="play.fill" size={14} color={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topResultSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 12,
    opacity: 0.5,
  },
  topResultCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
    marginTop: 4,
  },
  topResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  topResultAvatar: {
    width: 64,
    height: 64,
  },
  topResultDetails: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  topResultName: {
    fontSize: 20,
    fontWeight: '700',
    flexShrink: 1,
  },
  topResultActions: {
    flexDirection: 'row',
    marginTop: 18,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
  },
  actionButtonText: {
    fontSize: 14,
  },
  songSection: {
    marginTop: 16,
    paddingTop: 16,
  },
  songSectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 10,
  },
  songArtwork: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  songDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  songPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
