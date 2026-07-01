import React from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SongCard, AlbumCard } from '@/components/cards';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';
import { useCurrentTrack, usePlayerState } from '@/services';
import { Typography, Muted } from '@/components/ui/typography';
import { useTrackOptions } from '@/contexts/track-options-context';

interface ArtistTabContentProps {
  activeTab: string;
  grouped: Record<string, any[]>;
  artistName: string;
  onSongPress: (song: any) => void;
  onTilePress: (item: any) => void;
}

export function ArtistTabContent({
  activeTab,
  grouped,
  artistName,
  onSongPress,
  onTilePress,
}: ArtistTabContentProps) {
  const { colors } = useAppTheme();
  const { openAlbumOptions, openPlaylistOptions, openArtistOptions } = useTrackOptions();
  const currentTrack = useCurrentTrack();
  const { isPlaying } = usePlayerState();

  const renderSong = (item: any, index: number) => {
    const trackId = item.videoId || item.id;
    const isActive = !!(currentTrack?.id === trackId || (currentTrack?.id && currentTrack.id.includes(trackId)));
    return (
      <Animated.View key={item.id || index} entering={FadeInDown.delay(index * 40).springify()}>
        <SongCard
          title={item.title}
          artist={item.artist || artistName}
          artwork={item.thumbnail}
          index={index}
          showRank={true}
          rightIcon="play"
          isActive={isActive}
          isPlaying={isPlaying}
          onPress={() => onSongPress(item)}
          track={{
            id: trackId,
            title: item.title,
            artist: item.artist || artistName,
            album: item.album || 'Single',
            artwork: item.thumbnail || '',
            url: `https://music.youtube.com/watch?v=${trackId}`,
            duration: item.duration || 0,
            artistId: item.artistId || undefined,
            albumId: item.albumId || undefined,
          }}
        />
      </Animated.View>
    );
  };

  const renderCarousel = (section: any, sIdx: number) => (
    <View key={sIdx} style={styles.carouselSection}>
      <Typography style={[styles.carouselTitle, { color: colors.text }]}>{section.title}</Typography>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselScroll}>
        {section.items.map((item: any, idx: number) => (
          <Animated.View key={idx} entering={FadeInRight.delay(idx * 60)}>
            <AlbumCard
              title={item.title || item.name}
              subtitle={item.year || item.artist || (item.type === 'album' ? 'Album' : 'Playlist')}
              artwork={item.thumbnail}
              type={item.type}
              variant="carousel"
              onPress={() => onTilePress(item)}
              onLongPress={() => {
                if (item.type === 'album') {
                  openAlbumOptions({ id: item.id, title: item.title || item.name || '', artist: item.artist || '', artwork: item.thumbnail });
                } else if (item.type === 'playlist') {
                  openPlaylistOptions({ id: item.id, name: item.title || item.name || '', artwork: item.thumbnail });
                } else if (item.type === 'artist') {
                  openArtistOptions({ id: item.id, name: item.name || item.title || '', artwork: item.thumbnail });
                }
              }}
            />
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );

  const renderGrid = (section: any, sIdx: number) => (
    <View key={sIdx} style={styles.gridSection}>
      <Typography style={[styles.carouselTitle, { color: colors.text, paddingHorizontal: 0 }]}>{section.title}</Typography>
      <View style={styles.gridContainer}>
        {section.items.map((item: any, idx: number) => (
          <Animated.View key={idx} entering={FadeInDown.delay(idx * 40)} style={styles.gridItem}>
            <AlbumCard
              title={item.title || item.name}
              subtitle={item.year || item.artist || (item.type === 'album' ? 'Album' : 'Playlist')}
              artwork={item.thumbnail}
              type={item.type}
              variant="grid"
              onPress={() => onTilePress(item)}
              onLongPress={() => {
                if (item.type === 'album') {
                  openAlbumOptions({ id: item.id, title: item.title || item.name || '', artist: item.artist || '', artwork: item.thumbnail });
                } else if (item.type === 'playlist') {
                  openPlaylistOptions({ id: item.id, name: item.title || item.name || '', artwork: item.thumbnail });
                } else if (item.type === 'artist') {
                  openArtistOptions({ id: item.id, name: item.name || item.title || '', artwork: item.thumbnail });
                }
              }}
            />
          </Animated.View>
        ))}
      </View>
    </View>
  );

  const renderAbout = (section: any, sIdx: number) => {
    const about = section.items[0];
    if (!about) return null;
    return (
      <View key={sIdx} style={styles.aboutSection}>
        {about.views && (
          <View style={[styles.viewsPill, { backgroundColor: addAlpha(colors.primary, 0.09) }]}>
            <Typography style={[styles.viewsPillText, { color: colors.primary }]}>{about.views}</Typography>
          </View>
        )}
        <Typography style={[styles.aboutText, { color: colors.text }]}>{about.description}</Typography>
      </View>
    );
  };

  const sections = grouped[activeTab] ?? [];
  if (sections.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Muted style={{ textAlign: 'center' }}>Nothing here yet</Muted>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {sections.map((sec, sIdx) => {
        if (sec.type === 'list') {
          return (
            <View key={sIdx}>
              {sec.items.slice(0, 15).map((item: any, i: number) => renderSong(item, i))}
            </View>
          );
        }
        if (sec.type === 'carousel') {
          if (activeTab === 'Albums' || activeTab === 'Singles & EPs') {
            return renderGrid(sec, sIdx);
          }
          return renderCarousel(sec, sIdx);
        }
        if (sec.type === 'about') return renderAbout(sec, sIdx);
        return null;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emptyTab: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  carouselSection: {
    marginBottom: 8,
    marginHorizontal: -20,
  },
  carouselTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    paddingHorizontal: 20,
  },
  carouselScroll: {
    paddingHorizontal: 20,
    gap: 14,
  },
  gridSection: {
    marginBottom: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  gridItem: {
    width: '48%',
  },
  aboutSection: {
    paddingTop: 8,
    gap: 14,
  },
  viewsPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewsPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 24,
  },
});
