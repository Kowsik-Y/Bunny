import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Dimensions,
  ScrollView, ActivityIndicator, Animated as RNAnimated, Pressable,
} from 'react-native';
import { Typography as Text } from '@/components/ui/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { PlayerActions } from '@/services/SetupService';
import { getArtistDetails, searchYtMusic } from '@/services/ytMusic';

import { ArtistHero } from '@/components/artist/ArtistHero';
import { ArtistTabBar, ArtistActionButtons } from '@/components/artist/ArtistTabBar';
import { ArtistTabContent } from '@/components/artist/ArtistTabContent';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

const TABS = ['Top Songs', 'Albums', 'Singles & EPs', 'About'] as const;
type TabKey = typeof TABS[number];

// ── Map section titles → tab keys ──────────────────────────────────────────
function sectionTab(section: any): TabKey {
  const t = (section.title ?? '').toLowerCase();
  if (section.type === 'about') return 'About';
  if (t.includes('single') || t.includes('ep')) return 'Singles & EPs';
  if (t.includes('album')) return 'Albums';
  return 'Top Songs';
}

export default function ArtistScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [artistData, setArtistData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('Top Songs');
  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const tabScrollRef = useRef<ScrollView>(null);

  useEffect(() => { if (id) loadArtist(); }, [id]);

  const loadArtist = async () => {
    if (!id || id === 'undefined') {
      setLoading(false);
      setArtistData(null);
      return;
    }
    try {
      setLoading(true);
      const data = await getArtistDetails(id as string);
      setArtistData(data);
    } catch (e) {
      console.error('Artist load error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleArtistShuffle = async () => {
    try {
      const searchRes = await searchYtMusic((artistData.name ?? '') + ' songs');
      if (searchRes.songs.length > 0) {
        const shuffled = [...searchRes.songs]
          .sort(() => Math.random() - 0.5)
          .map((s: any) => ({ id: s.id, url: s.url || '', title: s.title || '', artist: s.artist || '', album: s.album || 'Single', artwork: s.thumbnail || '', duration: s.duration || 0 }));
        await PlayerActions.playCollection(shuffled as any);
      }
    } catch (err) { console.error(err); }
  };

  const handleArtistMix = async () => {
    try {
      const searchRes = await searchYtMusic((artistData.name ?? '') + ' songs');
      if (searchRes.songs.length > 0) {
        const mix = searchRes.songs.map((s: any) => ({ id: s.id, url: s.url || '', title: s.title || '', artist: s.artist || '', album: s.album || 'Single', artwork: s.thumbnail || '', duration: s.duration || 0 }));
        await PlayerActions.playCollection(mix as any);
      }
    } catch (err) { console.error(err); }
  };

  const handleTilePress = (item: any) => {
    if (item.type === 'album') {
      router.push(`/album/${item.id}` as any);
    } else if (item.type === 'artist') {
      router.push(`/artist/${item.id}` as any);
    } else if (item.type === 'playlist') {
      router.push(`/playlist/${item.id}` as any);
    } else if (item.type === 'video' || item.type === 'song') {
      PlayerActions.skipToTrackFromYt({
        id: item.id || item.videoId,
        title: item.title || item.name || 'Unknown Title',
        artist: item.artist || item.author || artistData?.name || 'Unknown Artist',
        thumbnail: item.thumbnail || item.artwork || '',
        url: item.url || `https://music.youtube.com/watch?v=${item.id || item.videoId}`,
        duration: item.duration || 0,
        type: 'song',
        artistId: item.artistId || id as string,
        albumId: item.albumId,
      });
    }
  };

  // ── header animation ────────────────────────────────────────────────────
  const headerScale = scrollY.interpolate({ inputRange: [-100, 0], outputRange: [1.3, 1], extrapolate: 'clamp' });
  const headerOpacity = scrollY.interpolate({ inputRange: [0, HEADER_HEIGHT - 80], outputRange: [1, 0], extrapolate: 'clamp' });
  const navTitleOpacity = scrollY.interpolate({ inputRange: [HEADER_HEIGHT - 100, HEADER_HEIGHT - 40], outputRange: [0, 1], extrapolate: 'clamp' });

  // ── sections grouped by tab ─────────────────────────────────────────────
  const grouped = React.useMemo(() => {
    if (!artistData?.sections) return {} as Record<TabKey, any[]>;
    const g: Record<TabKey, any[]> = { 'Top Songs': [], 'Albums': [], 'Singles & EPs': [], 'About': [] };
    for (const sec of artistData.sections) {
      g[sectionTab(sec)].push(sec);
    }
    return g;
  }, [artistData]);

  const availableTabs = TABS.filter(t => (grouped[t]?.length ?? 0) > 0);

  const handleSongPress = (item: any) => {
    PlayerActions.skipToTrackFromYt({
      id: item.id,
      title: item.title,
      artist: item.artist || artistData.name,
      thumbnail: item.thumbnail,
      url: `https://music.youtube.com/watch?v=${item.id}`,
      duration: 0,
      type: 'song',
      artistId: item.artistId || id as string,
      albumId: item.albumId,
    });
  };

  // ── loading / error ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!artistData) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>Artist not found</Text>
        <Pressable onPress={() => router.back()} style={[styles.backFallback, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.background, fontWeight: '700' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const thumbnailUrl = artistData.thumbnails?.[artistData.thumbnails.length - 1]?.url;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <RNAnimated.ScrollView
        onScroll={RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        stickyHeaderIndices={[2]} // the tab bar is now index 2
      >
        {/* ── Header Image (index 0) ── */}
        <ArtistHero
          thumbnailUrl={thumbnailUrl}
          name={artistData.name}
          subscribers={artistData.subscribers}
          headerScale={headerScale}
          headerOpacity={headerOpacity}
          onBackPress={() => router.back()}
        />

        {/* ── Action Buttons (index 1 - non-sticky) ── */}
        <ArtistActionButtons
          onShuffle={handleArtistShuffle}
          onMix={handleArtistMix}
        />

        {/* ── Tab Bar (index 2 - sticky) ── */}
        <ArtistTabBar
          availableTabs={availableTabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabScrollRef={tabScrollRef}
        />

        {/* ── Tab Content ── */}
        <ArtistTabContent
          activeTab={activeTab}
          grouped={grouped}
          artistName={artistData.name}
          onSongPress={handleSongPress}
          onTilePress={handleTilePress}
        />
      </RNAnimated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  backFallback: { marginTop: 10, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
});
