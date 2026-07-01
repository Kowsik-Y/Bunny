import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { H2, Typography } from '@/components/ui/typography';
import { FeaturedAlbumCard } from '@/components/cards';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useTrackOptions } from '@/contexts/track-options-context';

interface FeaturedAlbumItem {
  id: string;
  title: string;
  sub: string;
  color: string;
  type: string;
}

interface FeaturedAlbumsProps {
  albums: FeaturedAlbumItem[];
  onAlbumPress: (album: FeaturedAlbumItem) => void;
}

export function FeaturedAlbums({ albums, onAlbumPress }: FeaturedAlbumsProps) {
  const { colors } = useAppTheme();
  const { openAlbumOptions } = useTrackOptions();

  return (
    <View>
      <View style={styles.sectionHeader}>
        <H2 style={styles.sectionTitle}>Featured Albums</H2>
        <TouchableOpacity onPress={() => { }}>
          <Typography style={{ color: colors.primary }}>See All</Typography>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredScroll}>
        {albums.map((item, index) => (
          <FeaturedAlbumCard
            key={index}
            title={item.title}
            subtitle={item.sub}
            color={item.color}
            onPress={() => onAlbumPress(item)}
            onLongPress={() => openAlbumOptions({ id: item.id, title: item.title, artist: item.sub })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    letterSpacing: -0.5,
  },
  featuredScroll: {
    marginBottom: 32,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
});
