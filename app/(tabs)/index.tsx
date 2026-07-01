import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  Share,
  Image,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TrackPlayer from 'react-native-track-player';

import { setupPlayer, PlayerActions } from '@services/SetupService';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from '@/components/themed-view';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { type AppTrack } from '@/components/player/Tracks';
import { searchYtMusic, upgradeThumbQuality } from '@/services/ytMusic';
import { addAlpha } from '@/constants/theme';

import { GreetingHeader } from '@/components/home/GreetingHeader';
import { TrendingCarousel, QuickTrack } from '@/components/home/TrendingCarousel';
import { MoodMixesGrid } from '@/components/home/MoodMixesGrid';
import { TrackList } from '@/components/home/TrackList';
import { RadioStations } from '@/components/explore/RadioStations';
import { SwipeBottomSheet } from '@/components/player/SwipeBottomSheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography, Muted } from '@/components/ui/typography';
import { useTrackOptions } from '@/contexts/track-options-context';

const { width } = Dimensions.get('window');



// Static mood mixes shown immediately — no network needed
const MOOD_MIXES = [
  { id: 'jfKfPfyJRdk', title: 'Late Night Chill', color: '#A2D2FF', icon: 'moon.fill', desc: 'Lo-fi beats' },
  { id: 'ktvTqknDobU', title: 'Pop Boost', color: '#FFC8DD', icon: 'forward.fill', desc: 'Top hits' },
  { id: 'Dx5qFachd3A', title: 'Jazz Cafe', color: '#B5EAD7', icon: 'quote.bubble', desc: 'Smooth horns' },
  { id: '5qap5aO4i9A', title: 'Electronic', color: '#D5AAFF', icon: 'gearshape.fill', desc: 'EDM & Synth' },
  { id: 'f9X1N4bHYrI', title: 'Rock Classics', color: '#FF9AA2', icon: 'forward.fill', desc: 'Guitar-driven' },
  { id: 'bEeaS6fuUoA', title: 'Hip-Hop', color: '#FFDAC1', icon: 'shuffle', desc: 'Bars & beats' },
];

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
    tracks.push({ id, title, artist, artwork, duration, artistId, albumId });
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
  }));
  await TrackPlayer.reset();
  await TrackPlayer.add(appTracks);
  await TrackPlayer.skip(startIdx);
  await TrackPlayer.play();
}

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const bottomSpacing = useBottomTabSpacing();
  const [ready, setReady] = useState(false);
  const [trending, setTrending] = useState<QuickTrack[]>([]);
  const [quickPicks, setQuickPicks] = useState<QuickTrack[]>([]);
  const [discover, setDiscover] = useState<QuickTrack[]>([]);
  const [favoritesMix, setFavoritesMix] = useState<QuickTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState<string>('');
  const [localStations, setLocalStations] = useState<any[]>([]);
  const fetchedRef = useRef(false);

  const { openTrackOptions } = useTrackOptions();

  const handleLongPressTrack = React.useCallback((track: QuickTrack) => {
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

  // 2. Fetch location and tracks
  useEffect(() => {
    if (!ready || fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchLocationAndTracks = async () => {
      let city = 'Chennai';
      let country = 'India';
      let searchSuffix = 'Tamil hits';
      let placeId = '';
      
      try {
        const geoRes = await fetch('http://radio.garden/api/geo');
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.title) {
            city = geoData.title;
            country = geoData.country || '';
            placeId = geoData.id || '';
            
            if (geoData.code === 'IN') {
              if (city.toLowerCase().includes('bengaluru') || city.toLowerCase().includes('bangalore')) {
                searchSuffix = 'Kannada hits';
              } else if (city.toLowerCase().includes('mumbai')) {
                searchSuffix = 'Hindi trending';
              } else if (city.toLowerCase().includes('hyderabad')) {
                searchSuffix = 'Telugu hits';
              } else if (city.toLowerCase().includes('delhi')) {
                searchSuffix = 'Punjabi hindi hits';
              } else {
                searchSuffix = 'Tamil hits';
              }
            } else if (geoData.code === 'US') {
              searchSuffix = 'US pop hits';
            } else if (geoData.code === 'GB') {
              searchSuffix = 'UK billboard';
            } else {
              searchSuffix = `${country} hits`;
            }
          }
        }
      } catch (err) {
        console.warn('[Home] Failed to fetch geo location:', err);
      }
      
      setLocationName(city);

      try {
        const localSearchTerm = `${city} ${searchSuffix}`;
        const localSearchRes = await searchYtMusic(localSearchTerm);
        const localMapped: QuickTrack[] = (localSearchRes?.songs || []).slice(0, 10).map(s => ({
          id: s.id,
          title: s.title || 'Unknown Title',
          artist: s.artist || 'Unknown Artist',
          artwork: upgradeThumbQuality(s.thumbnail),
          duration: s.duration || 180,
          artistId: s.artistId,
          albumId: s.albumId,
          artists: s.artists,
        }));

        const trendingSearchRes = await searchYtMusic(`${country} trending hits`);
        const trendingMapped: QuickTrack[] = (trendingSearchRes?.songs || []).slice(0, 10).map(s => ({
          id: s.id,
          title: s.title || 'Unknown Title',
          artist: s.artist || 'Unknown Artist',
          artwork: upgradeThumbQuality(s.thumbnail),
          duration: s.duration || 180,
          artistId: s.artistId,
          albumId: s.albumId,
          artists: s.artists,
        }));

        const SEEDS = ['jfKfPfyJRdk', 'ktvTqknDobU'];
        const [t3, t4] = await Promise.all([
          fetchRadioTracks(SEEDS[0], 8),
          fetchRadioTracks(SEEDS[1], 8),
        ]);

        setTrending(localMapped.length > 0 ? localMapped : t3);
        setQuickPicks(trendingMapped.length > 0 ? trendingMapped : t4);
        setDiscover(t3);
        setFavoritesMix(t4);
        
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
              const colorsList = ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA'];
              const mapped = fetchedList.slice(0, 8).map((item, idx) => ({
                id: item.page?.url || String(idx),
                title: item.title || item.page?.title || 'Unknown Station',
                sub: `Live • ${city}`,
                color: colorsList[idx % colorsList.length],
                url: item.page?.url || ''
              }));
              setLocalStations(mapped);
            }
          } catch (err) {
            console.warn('[Home] Failed to load local stations:', err);
          }
        }
        
        setLoading(false);
      } catch (e) {
        console.warn('[Home] Failed to fetch tracks:', e);
        setLoading(false);
      }
    };

    fetchLocationAndTracks();
  }, [ready]);

  const handleMoodPress = async (mix: typeof MOOD_MIXES[0]) => {
    try {
      const tracks = await fetchRadioTracks(mix.id, 15);
      if (tracks.length > 0) {
        await playTracks(tracks, 0);
      }
    } catch (e) {
      console.warn('[Home] handleMoodPress error', e);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: bottomSpacing + 20 }]}
          >
            {/* Editorial greeting */}
            <GreetingHeader />

            {/* Peek carousel – top trending */}
            <TrendingCarousel
              title={locationName ? `Trending in ${locationName}` : 'Trending Near You'}
              trending={trending}
              loading={loading}
              onPlayTracks={playTracks}
              onLongPressTrack={handleLongPressTrack}
            />

            {/* Vibe Check mood grid */}
            <MoodMixesGrid
              mixes={MOOD_MIXES}
              onMixPress={handleMoodPress}
            />

            {/* Numbered track list – local picks */}
            <TrackList
              title="Local Favorites"
              tracks={quickPicks}
              loading={loading}
              onPlayTracks={playTracks}
              onLongPressTrack={handleLongPressTrack}
            />

            {/* Live Radio chips */}
            {(loading || localStations.length > 0) && (
              <RadioStations
                stations={localStations}
                onStationPress={playRadioStation}
                loading={loading}
              />
            )}

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
          </ScrollView>

          {/* Top Fade Gradient */}
          <LinearGradient
            colors={[
              colors.background,
              addAlpha(colors.background, 0.9),
              addAlpha(colors.background, 0.6),
              addAlpha(colors.background, 0.3),
              addAlpha(colors.background, 0.1),
              'transparent'
            ]}
            style={styles.topGradient}
            pointerEvents="none"
          />

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
