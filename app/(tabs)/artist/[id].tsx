import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Dimensions,
  ScrollView, ActivityIndicator, Animated as RNAnimated, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Typography as Text } from '@/components/ui/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/contexts/app-theme-context';
import { PlayerActions } from '@/services/SetupService';
import { getArtistDetails, searchYtMusic } from '@/services/ytMusic';
import { addAlpha } from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { ChevronDown, ChevronLeft } from 'lucide-react-native';


import { ArtistHero } from '@/components/artist/ArtistHero';
import { ArtistTabBar, ArtistActionButtons } from '@/components/artist/ArtistTabBar';
import { ArtistTabContent } from '@/components/artist/ArtistTabContent';
import { Button } from '@/components/ui/button';
import { ThemedView } from '@/components/themed-view';


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
  const scrollViewRef = useRef<ScrollView>(null);
  const bottomSpacing = useBottomTabSpacing();
  const isFirstRender = useRef(true);
  const scrollYVal = useRef(0);

  useEffect(() => { if (id) loadArtist(); }, [id]);

  useEffect(() => {
    const animId = scrollY.addListener(({ value }) => {
      scrollYVal.current = value;
    });
    return () => scrollY.removeListener(animId);
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!artistData) return;

    const targetY = HEADER_HEIGHT - stickyOffset;
    if (scrollYVal.current > targetY) {
      scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
    }
  }, [activeTab]);

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
          .map((s: any) => ({ id: s.id, url: 'https://dummy.com', title: s.title || '', artist: s.artist || '', album: s.album || 'Single', artwork: s.thumbnail || '', duration: s.duration || 0 }));
        await PlayerActions.playCollection(shuffled as any);
      }
    } catch (err) { console.error(err); }
  };

  const handleArtistMix = async () => {
    try {
      const searchRes = await searchYtMusic((artistData.name ?? '') + ' songs');
      if (searchRes.songs.length > 0) {
        const mix = searchRes.songs.map((s: any) => ({ id: s.id, url: 'https://dummy.com', title: s.title || '', artist: s.artist || '', album: s.album || 'Single', artwork: s.thumbnail || '', duration: s.duration || 0 }));
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
  const headerOpacity = scrollY.interpolate({ inputRange: [0, Math.max(1, HEADER_HEIGHT - 80)], outputRange: [1, 0], extrapolate: 'clamp' });

  const navTitleStart = Math.max(0, HEADER_HEIGHT - 100);
  const navTitleEnd = Math.max(navTitleStart + 1, HEADER_HEIGHT - 40);
  const navTitleOpacity = scrollY.interpolate({ inputRange: [navTitleStart, navTitleEnd], outputRange: [0, 1], extrapolate: 'clamp' });

  const stickyOffset = insets.top;
  const stickyThreshold = HEADER_HEIGHT - stickyOffset;

  const th1 = 0;
  const th2 = Math.max(th1 + 1, stickyThreshold);
  const th3 = Math.max(th2 + 1, HEADER_HEIGHT);
  const stickyTranslateY = scrollY.interpolate({
    inputRange: [th1, th2, th3],
    outputRange: [0, 0, stickyOffset],
    extrapolate: 'clamp',
  });

  // Top gradient fades in only after the user scrolls past the hero
  const topGradientOpacity = scrollY.interpolate({
    inputRange: [Math.max(0, HEADER_HEIGHT - 120), HEADER_HEIGHT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

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
      <ThemedView style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </ThemedView>
    );
  }

  if (!artistData) {
    return (
      <ThemedView style={[styles.screen, styles.center]}>
        <Text style={{ color: colors.mutedForeground, marginBottom: 16 }}>Artist not found</Text>
        <Button onPress={() => router.back()} variant="default" label="Go Back" />
      </ThemedView>
    );
  }

  const thumbnailUrl = artistData.thumbnails?.[artistData.thumbnails.length - 1]?.url;


  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.stickyBackContainer} pointerEvents="box-none">
        <Button
          style={{
            padding: 5,
            paddingHorizontal: 12,
            borderRadius: 50,
            backgroundColor: addAlpha(colors.background, 0.85),
            borderColor: colors.border,
            borderWidth: 0.8,
            alignSelf: 'flex-start',
            pointerEvents: 'auto',
          }}
          onPress={() => router.back()}
          variant="secondary" size="icon">
          <ChevronLeft size={20} color={colors.primary} />
        </Button>
      </SafeAreaView>

      <RNAnimated.ScrollView
        ref={scrollViewRef as any}
        onScroll={RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
        stickyHeaderIndices={[1]}
      >
        {/* ── Header Image ── */}
        <ArtistHero
          thumbnailUrl={thumbnailUrl}
          name={artistData.name}
          subscribers={artistData.subscribers}
          headerScale={headerScale}
          headerOpacity={headerOpacity}
          height={HEADER_HEIGHT}
        />

        {/* ── Sticky Action Buttons & Tab Bar Wrapper ── */}
        <View style={{ zIndex: 10 }}>
          <RNAnimated.View style={{ transform: [{ translateY: stickyTranslateY }] }}>
            <ArtistActionButtons
              onShuffle={handleArtistShuffle}
              onMix={handleArtistMix}
            />
            <ArtistTabBar
              availableTabs={availableTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </RNAnimated.View>
        </View>

        {/* ── Tab Content ── */}
        <ArtistTabContent
          activeTab={activeTab}
          grouped={grouped}
          artistName={artistData.name}
          onSongPress={handleSongPress}
          onTilePress={handleTilePress}
        />
      </RNAnimated.ScrollView>

      {/* Top Fade Gradient — fades in as hero scrolls out of view */}
      <RNAnimated.View
        style={[styles.topGradient, { height: insets.top + 60, opacity: topGradientOpacity }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            colors.background,
            addAlpha(colors.background, 1),
            addAlpha(colors.background, 1),
            addAlpha(colors.background, 0),
            addAlpha(colors.background, 0),
            'transparent',
          ]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </RNAnimated.View>

      {/* Bottom Fade Gradient */}
      <LinearGradient
        colors={[
          'transparent',
          addAlpha(colors.background, 0.1),
          addAlpha(colors.background, 0.3),
          addAlpha(colors.background, 0.6),
          addAlpha(colors.background, 0.9),
          colors.background
        ]}
        style={[styles.bottomGradient, { height: bottomSpacing + 25 }]}
        pointerEvents="none"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  backFallback: { marginTop: 10, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  stickyBackContainer: {
    position: 'absolute',
    top: 20,
    left: 15,
    zIndex: 100,
    right: 0,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 10,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
