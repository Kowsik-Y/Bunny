import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';

import { type AppTrack } from '@/components/player/Tracks';
import { ThemedView } from '@/components/themed-view';
import { addAlpha } from '@/constants/theme';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { setupPlayer } from '@/services/SetupService';
import { searchYtMusic, upgradeThumbQuality } from '@/services/ytMusic';
import { LinearGradient } from 'expo-linear-gradient';

import { RadioStations } from '@/components/explore/RadioStations';
import { GreetingHeader } from '@/components/home/GreetingHeader';
import { HomeSectionCarousel } from '@/components/home/HomeSectionCarousel';
import { SpeedDial } from '@/components/home/SpeedDial';
import { TrackList } from '@/components/home/TrackList';
import { QuickTrack, TrendingCarousel } from '@/components/home/TrendingCarousel';
import { useTrackOptions } from '@/contexts/track-options-context';
import { getHomePage, getHomePageContinuation, type HomeItem, type HomeSection } from '@/services/ytmusic/home';

const { width: screenWidth } = Dimensions.get('window');



async function fetchRadioTracks(seedId: string, limit = 12): Promise<QuickTrack[]> {
  const body = {
    videoId: seedId,
    playlistId: 'RDAMVM' + seedId,
    context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20250101.01.00', hl: 'en', gl: 'US' } },
    enablePersistentPlaylistPanel: true,
    isAudioOnly: true,
  };
  const res = await fetch('https://music.youtube.com/youtubei/v1/next?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:140.0) Gecko/20100101 Firefox/140.0',
      'X-YouTube-Client-Name': '67',
      'X-YouTube-Client-Version': '1.20250101.01.00',
      Origin: 'https://music.youtube.com',
      Referer: 'https://music.youtube.com/',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const data = await res.json();
  const panels =
    data?.contents?.singleColumnMusicWatchNextResultsRenderer
      ?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]
      ?.tabRenderer?.content?.musicQueueRenderer?.content
      ?.playlistPanelRenderer?.contents ?? [];
  const tracks: QuickTrack[] = [];
  for (const panel of panels) {
    const item = panel?.playlistPanelVideoRenderer;
    if (!item) continue;
    const id = item.videoId;
    if (!id || id === seedId) continue;
    const title = item.title?.runs?.[0]?.text ?? 'Unknown';
    const artist = item.shortBylineText?.runs?.[0]?.text ?? 'Unknown Artist';
    const artistId = item.shortBylineText?.runs?.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
    const albumId = item.longBylineText?.runs?.find((r: any) => r.navigationEndpoint?.browseEndpoint?.browseId)?.navigationEndpoint?.browseEndpoint?.browseId;
    const thumbs = item.thumbnail?.thumbnails ?? [];
    const rawThumb = thumbs[thumbs.length - 1]?.url ?? '';
    // Also try building a direct maxresdefault URL from the videoId for best quality
    const artwork = id
      ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`
      : upgradeThumbQuality(rawThumb);
    const durationText = item.lengthText?.runs?.[0]?.text ?? '0:00';
    const parts = durationText.split(':').map(Number);
    const duration =
      parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + (parts[2] ?? 0);
    const isExplicit = item.badges?.some(
      (b: any) => b?.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
    ) || false;
    tracks.push({ id, title, artist, artwork, duration, artistId, albumId, explicit: isExplicit });
    if (tracks.length >= limit) break;
  }
  return tracks;
}

async function playTracks(tracks: QuickTrack[], startIdx = 0) {
  if (tracks.length === 0) return;
  const appTracks: AppTrack[] = tracks.map((t) => ({
    id: t.id,
    url: 'https://dummy.com/track-' + t.id + '.mp3',
    title: t.title,
    artist: t.artist,
    album: 'Single',
    duration: t.duration,
    artwork: t.artwork,
    artistId: t.artistId,
    albumId: t.albumId,
    artists: t.artists,
    explicit: t.explicit,
  }));
  await TrackPlayer.reset();
  await TrackPlayer.add(appTracks);
  await TrackPlayer.skip(startIdx);
  await TrackPlayer.play();
}

export default function HomeScreen() {
  const { colors, colorScheme, explicitContentEnabled, recommendationLanguages } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const bottomSpacing = useBottomTabSpacing();
  const [ready, setReady] = useState(false);
  const [trending, setTrending] = useState<QuickTrack[]>([]);
  const [quickPicks, setQuickPicks] = useState<QuickTrack[]>([]);
  const [discover, setDiscover] = useState<QuickTrack[]>([]);
  const [favoritesMix, setFavoritesMix] = useState<QuickTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>('');
  const [localStations, setLocalStations] = useState<any[]>([]);
  const [homeSections, setHomeSections] = useState<HomeSection[]>([]);
  const [homeContinuation, setHomeContinuation] = useState<string | null>(null);
  const [loadingHome, setLoadingHome] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchedRef = useRef(false);

  const { openTrackOptions } = useTrackOptions();

  const handleLongPressTrack = useCallback((track: QuickTrack) => {
    const appTrack: AppTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: 'Single',
      duration: track.duration,
      artwork: track.artwork,
      url: 'https://dummy.com/track-' + track.id + '.mp3',
      artistId: track.artistId,
      albumId: track.albumId,
      artists: track.artists,
      explicit: track.explicit,
    };
    openTrackOptions(appTrack);
  }, [openTrackOptions]);

  const playRadioStation = async (station: any) => {
    try {
      const urlParts = station.url.split('/');
      const channelId = urlParts[urlParts.length - 1];
      const streamUrl = `https://radio.garden/api/ara/content/listen/${channelId}/channel.mp3`;

      const trackObj: AppTrack = {
        id: `radiogarden-${channelId}`,
        url: streamUrl,
        title: station.title || 'Live Broadcast',
        artist: station.sub || 'Live Radio',
        album: 'Radio Garden',
        duration: 0,
        artwork: 'https://radio.garden/icons/favicon.png',
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      };

      await TrackPlayer.reset();
      await TrackPlayer.add([trackObj]);
      await TrackPlayer.play();
    } catch (e) {
      console.warn('Failed to play radio station:', e);
    }
  };

  // 1. Init player immediately — just a JS state flag, no heavy work
  useEffect(() => {
    setupPlayer().then(() => setReady(true)).catch(() => setReady(true));
  }, []);

  // 2a. Fetch YouTube Music home sections (native)
  useEffect(() => {
    if (!ready) return;
    const fetchHome = async () => {
      setLoadingHome(true);
      try {
        const { sections, continuation } = await getHomePage();
        let filtered = sections;
        if (!explicitContentEnabled) {
          filtered = sections.map(s => ({
            ...s,
            items: s.items.filter(i => !i.explicit),
          })).filter(s => s.items.length > 0);
        }
        setHomeSections(filtered);
        setHomeContinuation(continuation ?? null);
      } catch (e) {
        console.warn('[Home] getHomePage failed:', e);
      } finally {
        setLoadingHome(false);
      }
    };
    fetchHome();
  }, [ready]);

  const handleLoadMoreSections = useCallback(async () => {
    if (!homeContinuation || loadingMore) return;
    setLoadingMore(true);
    try {
      const { sections, continuation } = await getHomePageContinuation(homeContinuation);
      let filtered = sections;
      if (!explicitContentEnabled) {
        filtered = sections.map(s => ({
          ...s,
          items: s.items.filter(i => !i.explicit),
        })).filter(s => s.items.length > 0);
      }
      setHomeSections(prev => [...prev, ...filtered]);
      setHomeContinuation(continuation ?? null);
    } catch (e) {
      console.warn('[Home] loadMore failed:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [homeContinuation, loadingMore, explicitContentEnabled]);

  const handlePlayHomeItem = useCallback(async (item: HomeItem) => {
    const appTrack: AppTrack = {
      id: item.id,
      url: 'https://dummy.com/track-' + item.id + '.mp3',
      title: item.title || item.name || 'Unknown',
      artist: item.artist || 'Unknown Artist',
      album: 'Single',
      duration: item.duration || 0,
      artwork: item.thumbnail || '',
      artistId: item.artistId,
      albumId: item.albumId,
      artists: item.artists,
      explicit: item.explicit,
    };
    await TrackPlayer.reset();
    await TrackPlayer.add([appTrack]);
    await TrackPlayer.play();
  }, []);

  // 2b. Fetch location and tracks
  useEffect(() => {
    if (!ready || fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchLocationAndTracks = async () => {
      let city = 'Local';
      let country = 'India';
      let searchSuffix = 'hits';
      let placeId = '';

      if (recommendationLanguages && recommendationLanguages.length > 0) {
        searchSuffix = `${recommendationLanguages.join(' ')} hits`;
      } else {
        try {
          const ipRes = await fetch('http://ip-api.com/json');
          if (ipRes.ok) {
            const ipData = await ipRes.json();
            if (ipData && ipData.status === 'success') {
              city = ipData.city || 'Local';
              const region = ipData.regionName || '';
              country = ipData.country || 'India';

              if (ipData.countryCode === 'IN') {
                if (region.toLowerCase().includes('tamil')) {
                  searchSuffix = 'Tamil hits';
                } else if (region.toLowerCase().includes('karnataka')) {
                  searchSuffix = 'Kannada hits';
                } else if (region.toLowerCase().includes('telangana') || region.toLowerCase().includes('andhra')) {
                  searchSuffix = 'Telugu hits';
                } else if (region.toLowerCase().includes('kerala')) {
                  searchSuffix = 'Malayalam hits';
                } else if (region.toLowerCase().includes('maharashtra')) {
                  searchSuffix = 'Marathi hits';
                } else if (region.toLowerCase().includes('punjab')) {
                  searchSuffix = 'Punjabi hits';
                } else if (region.toLowerCase().includes('bengal') || region.toLowerCase().includes('kolkata')) {
                  searchSuffix = 'Bengali hits';
                } else {
                  searchSuffix = 'Hindi trending';
                }
              } else {
                searchSuffix = `${region || country} hits`;
              }
            }
          }
        } catch (err) {
          console.warn('[Home] ip-api geolocation failed:', err);
        }
      }

      // Detect location using Radio Garden Geo API
      try {
        const geoRes = await fetch('https://radio.garden/api/geo', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': 'https://radio.garden/'
          }
        });
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const detectedCity = geoData.city || '';
          const countryCode = geoData.country_code || 'IN';
          if (detectedCity) {
            city = detectedCity;
            country = countryCode;
          }
        }
      } catch (err) {
        console.warn('[Home] Radio Garden geo request failed:', err);
      }

      if (city && city !== 'Local') {
        try {
          const searchRes = await fetch(`https://radio.garden/api/search?q=${encodeURIComponent(city)}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Referer': 'https://radio.garden/'
            }
          });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const hits = searchData?.hits?.hits || [];
            const placeHit = hits.find((h: any) => h._source?.type === 'place');
            if (placeHit) {
              const urlParts = placeHit._source.page.url.split('/');
              const id = urlParts[urlParts.length - 1];
              if (id) {
                placeId = id;
                console.log(`[Home] Resolved Radio Garden placeId ${placeId} for city ${city}`);
              }
            }
          }
        } catch (err) {
          console.warn('[Home] Radio Garden search failed:', err);
        }
      }

      // Fallback to default city if detection failed
      if (!placeId) {
        city = 'Tamil Nadu';
        country = 'IN';
        placeId = 'jKelPaRC';
      }

      setLocationName(city);

      try {
        const localSearchTerm = `${city} ${searchSuffix}`;
        const localSearchRes = await searchYtMusic(localSearchTerm);
        let localSongs = localSearchRes?.songs || [];
        if (!explicitContentEnabled) {
          localSongs = localSongs.filter(s => !s.explicit);
        }
        const localMapped: QuickTrack[] = localSongs.slice(0, 10).map(s => ({
          id: s.id,
          title: s.title || 'Unknown Title',
          artist: s.artist || 'Unknown Artist',
          artwork: upgradeThumbQuality(s.thumbnail),
          duration: s.duration || 180,
          artistId: s.artistId,
          albumId: s.albumId,
          artists: s.artists,
          explicit: s.explicit,
        }));

        const trendingSearchTerm = recommendationLanguages && recommendationLanguages.length > 0
          ? `${recommendationLanguages.join(' ')} trending`
          : `${country} trending hits`;
        const trendingSearchRes = await searchYtMusic(trendingSearchTerm);
        let trendingSongs = trendingSearchRes?.songs || [];
        if (!explicitContentEnabled) {
          trendingSongs = trendingSongs.filter(s => !s.explicit);
        }
        const trendingMapped: QuickTrack[] = trendingSongs.slice(0, 10).map(s => ({
          id: s.id,
          title: s.title || 'Unknown Title',
          artist: s.artist || 'Unknown Artist',
          artwork: upgradeThumbQuality(s.thumbnail),
          duration: s.duration || 180,
          artistId: s.artistId,
          albumId: s.albumId,
          artists: s.artists,
          explicit: s.explicit,
        }));

        const SEEDS = ['jfKfPfyJRdk', 'ktvTqknDobU'];
        const [t3, t4] = await Promise.all([
          fetchRadioTracks(SEEDS[0], 12),
          fetchRadioTracks(SEEDS[1], 12),
        ]);

        let filteredT3 = t3;
        let filteredT4 = t4;
        if (!explicitContentEnabled) {
          filteredT3 = t3.filter(t => !t.explicit);
          filteredT4 = t4.filter(t => !t.explicit);
        }

        setTrending(localMapped.length > 0 ? localMapped : filteredT3.slice(0, 10));
        setQuickPicks(trendingMapped.length > 0 ? trendingMapped : filteredT4.slice(0, 10));
        setDiscover(filteredT3.slice(0, 8));
        setFavoritesMix(filteredT4.slice(0, 8));

        const colorsList = ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA'];
        let finalStations: any[] = [];

        // Fetch Radio Garden channels
        if (placeId) {
          try {
            const channelsRes = await fetch(`https://radio.garden/api/ara/content/page/${placeId}/channels`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': 'https://radio.garden/'
              }
            });
            if (channelsRes.ok) {
              const channelsData = await channelsRes.json();
              const sections = channelsData?.data?.content || [];
              const fetchedList: any[] = [];
              for (const section of sections) {
                if (section.items && (section.itemsType === 'channel' || section.type === 'list')) {
                  fetchedList.push(...section.items);
                }
              }
              finalStations = fetchedList.slice(0, 8).map((item, idx) => {
                const urlParts = item.page?.url?.split('/') || [];
                const channelId = urlParts[urlParts.length - 1] || String(idx);
                return {
                  id: `radiogarden-${channelId}`,
                  title: item.title || item.page?.title || 'Unknown Station',
                  sub: `Live • ${city}`,
                  color: colorsList[idx % colorsList.length],
                  url: item.page?.url || ''
                };
              });
            }
          } catch (err) {
            console.warn('[Home] Failed to load local stations:', err);
          }
        }

        if (finalStations.length === 0) {
          finalStations = [
            { id: 'radiogarden-lGryzXzM', title: 'Mirchi 98.3 FM', sub: 'Live • Mumbai', color: colorsList[0], url: '/listen/mirchi-mumbai/lGryzXzM' },
            { id: 'radiogarden-wE7iJc7Y', title: 'Radio City 91.1', sub: 'Live • Bengaluru', color: colorsList[1], url: '/listen/radio-city-91-1-fm/wE7iJc7Y' },
            { id: 'radiogarden-qO3S-P8B', title: 'Hungama Bollywood', sub: 'Live • Mumbai', color: colorsList[2], url: '/listen/hungama-bollywood-hits/qO3S-P8B' },
            { id: 'radiogarden-z1t9P4o8', title: 'Red FM 93.5', sub: 'Live • Delhi', color: colorsList[3], url: '/listen/red-fm-93-5/z1t9P4o8' },
          ];
        }
        setLocalStations(finalStations);

        setLoading(false);
      } catch (e) {
        console.warn('[Home] Failed to fetch tracks:', e);
        setLoading(false);
      }
    };

    fetchLocationAndTracks();
  }, [ready]);


  const isCloseToBottom = ({ layoutMeasurement, contentOffset, contentSize }: NativeScrollEvent) => {
    const paddingToBottom = 150;
    return layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
  };

  return (
    <ThemedView style={styles.screen}>
      {/* Background ambient gradient glow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={isDark ? ['#0b0a1a', '#05050a'] : ['#F3F0FA', '#E2DCF5']}
          style={StyleSheet.absoluteFill}
        />
        {/* Soft colorful accent glow circles - only visible in dark mode for premium look, keeping light mode clean */}
        {isDark && (
          <>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'transparent']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 450 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            />
            <LinearGradient
              colors={['rgba(236, 72, 153, 0.05)', 'transparent']}
              style={{ position: 'absolute', top: 180, left: -100, width: screenWidth + 200, height: 400 }}
              start={{ x: 0.1, y: 0.1 }}
              end={{ x: 0.9, y: 0.9 }}
            />
          </>
        )}
      </View>

      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: bottomSpacing + 20 }]}
            onScroll={({ nativeEvent }) => {
              if (isCloseToBottom(nativeEvent)) {
                handleLoadMoreSections();
              }
            }}
            scrollEventThrottle={400}
          >
            {/* Editorial greeting */}
            <GreetingHeader />


            {/* Dynamic YouTube Music Home Sections */}
            {loadingHome ? (
              <>
                <TrendingCarousel
                  title={locationName ? `Trending in ${locationName}` : 'Trending Near You'}
                  trending={[]}
                  loading={true}
                  onPlayTracks={playTracks}
                  onLongPressTrack={handleLongPressTrack}
                />
                <HomeSectionCarousel section={{ title: 'Loading...', items: [] }} loading />
                <HomeSectionCarousel section={{ title: 'Loading...', items: [] }} loading />
                <HomeSectionCarousel section={{ title: 'Loading...', items: [] }} loading />
              </>
            ) : homeSections.length > 0 ? (
              <>
                {/* Peek carousel – top trending */}
                <TrendingCarousel
                  title={locationName ? `Trending in ${locationName}` : 'Trending Near You'}
                  trending={trending}
                  loading={loading}
                  onPlayTracks={playTracks}
                  onLongPressTrack={handleLongPressTrack}
                />
                <SpeedDial />
                {homeSections[0] && (
                  <HomeSectionCarousel
                    section={homeSections[0]}
                    onPlayItem={handlePlayHomeItem}
                  />
                )}


                {(loading || localStations.length > 0) && (
                  <RadioStations
                    stations={localStations}
                    onStationPress={playRadioStation}
                    loading={loading}
                  />
                )}
                {homeSections[1] && (
                  <HomeSectionCarousel
                    section={homeSections[1]}
                    onPlayItem={handlePlayHomeItem}
                  />
                )}

                {homeSections.slice(2).map((section, idx) => (
                  <HomeSectionCarousel
                    key={`${section.title}-${idx + 2}`}
                    section={section}
                    onPlayItem={handlePlayHomeItem}
                  />
                ))}
                {/* Numbered track list – local picks */}
                <TrackList
                  title="Local Favorites"
                  tracks={quickPicks}
                  loading={loading}
                  onPlayTracks={playTracks}
                  onLongPressTrack={handleLongPressTrack}
                />


                {/* Peek carousel – daily discover */}
                <TrendingCarousel
                  title="Daily Discover"
                  trending={discover}
                  loading={loading}
                  onPlayTracks={playTracks}
                  onLongPressTrack={handleLongPressTrack}
                />

                {/* Numbered track list – forgotten favorites */}
                <TrackList
                  title="Forgotten Favorites"
                  tracks={favoritesMix}
                  loading={loading}
                  onPlayTracks={playTracks}
                  onLongPressTrack={handleLongPressTrack}
                />
              </>
            ) : (
              /* Fallback to search-based recommendation sections if home sections are empty */
              <>
                {/* Peek carousel – top trending */}
                <TrendingCarousel
                  title={locationName ? `Trending in ${locationName}` : 'Trending Near You'}
                  trending={trending}
                  loading={loading}
                  onPlayTracks={playTracks}
                  onLongPressTrack={handleLongPressTrack}
                />
                {/* Speed Dial / Pinned Tracks */}
                <SpeedDial />

                {/* Live Radio chips */}
                {(loading || localStations.length > 0) && (
                  <RadioStations
                    stations={localStations}
                    onStationPress={playRadioStation}
                    loading={loading}
                  />
                )} {/* Numbered track list – local picks */}
                <TrackList
                  title="Local Favorites"
                  tracks={quickPicks}
                  loading={loading}
                  onPlayTracks={playTracks}
                  onLongPressTrack={handleLongPressTrack}
                />


                {/* Peek carousel – daily discover */}
                <TrendingCarousel
                  title="Daily Discover"
                  trending={discover}
                  loading={loading}
                  onPlayTracks={playTracks}
                  onLongPressTrack={handleLongPressTrack}
                />

                {/* Numbered track list – forgotten favorites */}
                <TrackList
                  title="Forgotten Favorites"
                  tracks={favoritesMix}
                  loading={loading}
                  onPlayTracks={playTracks}
                  onLongPressTrack={handleLongPressTrack}
                />

              </>
            )}
          </ScrollView>



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

          {/* Swipe Options Bottom Sheet is managed globally by TrackOptionsProvider */}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  content: { paddingBottom: 60, paddingTop: 20 },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    zIndex: 10,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  sheetArt: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  sheetInfo: {
    flex: 1,
    gap: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sheetArtist: {
    fontSize: 14,
  },
  sheetOptions: {
    gap: 8,
  },
  sheetOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sheetIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
