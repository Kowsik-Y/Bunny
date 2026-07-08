import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';
import { BunnyCard } from '@/components/ui/bunny-card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Play, Shuffle, Radio, List, Pause } from 'lucide-react-native';

interface TopResultCardProps {
  type: 'song' | 'video' | 'artist' | 'album' | 'playlist';
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
    explicit?: boolean;
  };
  recommendedSong?: any; // ONLY used for artist type
  onPress: () => void;
  onPlay: () => void;
  onAction?: () => void;
  onRecommendedSongPress?: (song: any) => void;
  isActive?: boolean;
  isPlaying?: boolean;
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
  isActive = false,
  isPlaying = false,
}: TopResultCardProps) {
  const { colors } = useAppTheme();

  const isArtist = type === 'artist';
  const isSong = type === 'song' || type === 'video';
  const isAlbum = type === 'album' || type === 'playlist';

  const name = isArtist ? item.name : item.title;
  const thumbnail = isArtist ? item.thumbnail : (item.thumbnail || item.artwork);
  
  const subtitle = isArtist
    ? `Artist ${item.subscribers ? `• ${item.subscribers}` : ''}`
    : type === 'video'
    ? `Video • ${item.artist || 'Unknown Artist'} ${item.duration ? `• ${formatDuration(item.duration)}` : ''}`
    : isSong
    ? `Song • ${item.artist || 'Unknown Artist'} ${item.duration ? `• ${formatDuration(item.duration)}` : ''}`
    : type === 'playlist'
    ? `Playlist • ${item.artist || 'Unknown Artist'}`
    : `Album • ${item.artist || 'Unknown Artist'} ${item.year ? `• ${item.year}` : ''}`;

  const primaryBtnLabel = isArtist ? 'Shuffle' : (isActive && isPlaying) ? 'Pause' : 'Play';
  const secondaryBtnLabel = isArtist ? 'Mix' : isSong ? 'Radio' : 'Library';

  return (
    <View style={styles.topResultSection}>
      <Typography variant="small" style={styles.sectionLabel}>TOP RESULT</Typography>
      <BunnyCard
        onPress={onPress}
        bouncy={false}
        style={styles.topResultCard}
        contentContainerStyle={styles.topResultCardInner}
      >
        <View style={styles.topResultHeader}>
          <Image
            source={{ uri: thumbnail || 'https://picsum.photos/200/200' }}
            style={[styles.topResultAvatar, { borderRadius: isArtist ? 32 : 12 }]}
          />
          <View style={styles.topResultDetails}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Typography variant="large" style={[styles.topResultName, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
                {name}
              </Typography>
              {isSong && item.explicit && (
                <View style={{
                  backgroundColor: colors.mutedForeground,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  borderRadius: 3,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Typography style={{ fontSize: 9, fontWeight: '800', color: colors.background, lineHeight: 11 }}>
                    E
                  </Typography>
                </View>
              )}
            </View>
            <Typography variant="small" style={{ color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
              {subtitle}
            </Typography>
          </View>
          <ChevronRight size={20} color={addAlpha(colors.text, 0.32)} />
        </View>

        <View style={styles.topResultActions}>
          <Button
            variant="default"
            onPress={onPlay}
            style={{ flex: 1, height: 44, borderRadius: 22 }}
            leftIcon={
              isArtist ? (
                <Shuffle size={16} color={colors.primaryForeground} />
              ) : (isActive && isPlaying) ? (
                <Pause size={16} color={colors.primaryForeground} fill={colors.primaryForeground} />
              ) : (
                <Play size={16} color={colors.primaryForeground} fill={colors.primaryForeground} />
              )
            }
            label={primaryBtnLabel}
          />

          {onAction && (
            <Button
              variant="secondary"
              onPress={onAction}
              style={{ flex: 1, marginLeft: 8, height: 44, borderRadius: 22 }}
              leftIcon={
                isArtist ? (
                  <Radio size={16} color={colors.text} />
                ) : isSong ? (
                  <Radio size={16} color={colors.text} />
                ) : (
                  <List size={16} color={colors.text} />
                )
              }
              label={secondaryBtnLabel}
            />
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
              style={[styles.songRow, { backgroundColor: addAlpha(colors.text, 0.03), borderColor: colors.border, borderWidth: 1 }]}
            >
              <Image
                source={{ uri: recommendedSong.thumbnail || 'https://picsum.photos/100/100' }}
                style={styles.songArtwork}
              />
              <View style={styles.songDetails}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Typography style={[styles.songTitle, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>
                    {recommendedSong.title}
                  </Typography>
                  {recommendedSong.explicit && (
                    <View style={{
                      backgroundColor: colors.mutedForeground,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      borderRadius: 3,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Typography style={{ fontSize: 9, fontWeight: '800', color: colors.background, lineHeight: 11 }}>
                        E
                      </Typography>
                    </View>
                  )}
                </View>
                <Typography variant="small" style={{ color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                  Song • {recommendedSong.artist}
                </Typography>
              </View>
              <View style={[styles.songPlayButton, { backgroundColor: addAlpha(colors.primary, 0.1) }]}>
                <Play size={14} color={colors.primary} fill={colors.primary} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </BunnyCard>
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
    marginTop: 4,
  },
  topResultCardInner: {
    padding: 20,
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
