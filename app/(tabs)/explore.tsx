import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Keyboard, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Typography, H1, H2, Muted } from '@/components/ui/typography';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Input } from '@/components/ui/input';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { PlayerActions } from '@/services/SetupService';
import { useCurrentTrack, usePlayerState, toast } from '@/services';
import { searchYtMusic, getSearchSuggestions, YtMusicSearchResult, CategorizedSearchResults } from '@/services/ytMusic';
import TrackPlayer from 'react-native-track-player';
import { pipedService } from '@/services/piped';
import { SongCard, AlbumCard, AlbumRowCard, ArtistCard } from '@/components/cards';
import { Skeleton } from '@/components/ui/skeleton';
import { Feather } from '@expo/vector-icons';
import { useTrackOptions } from '@/contexts/track-options-context';

import { SuggestionsOverlay } from '@/components/explore/SuggestionsOverlay';
import { FilterChips } from '@/components/explore/FilterChips';
import { TopResultCard } from '@/components/explore/TopResultCard';
import { RecentSearches } from '@/components/explore/RecentSearches';
import { FeaturedAlbums } from '@/components/explore/FeaturedAlbums';
import { RadioStations } from '@/components/explore/RadioStations';
import { MoodsGenres } from '@/components/explore/MoodsGenres';

type SearchProvider = 'ytmusic' | 'piped';

const { width } = Dimensions.get('window');

interface CategoryItem {
  id: string;
  title: string;
  color: string;
  icon: IconSymbolName;
}

const CATEGORIES: CategoryItem[] = [
  { id: '1', title: 'Chill', color: '#B5EAD7', icon: 'house.fill' },
  { id: '2', title: 'Workout', color: '#FF9AA2', icon: 'forward.fill' },
  { id: '3', title: 'Focus', color: '#C7CEEA', icon: 'list.bullet' },
  { id: '4', title: 'Party', color: '#FFDAC1', icon: 'shuffle' },
  { id: '5', title: 'Sleep', color: '#E2F0CB', icon: 'heart' },
  { id: '6', title: 'Romance', color: '#FFB7B2', icon: 'quote.bubble' },
  { id: '7', title: 'Travel', color: '#B2E2F2', icon: 'airplayaudio' },
  { id: '8', title: 'Gaming', color: '#D5AAFF', icon: 'gearshape.fill' },
];


function getSearchScore(query: string, target: string): number {
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (q === t) return 10;
  if (t.startsWith(q)) return 8;
  if (t.includes(q)) return 5;
  if (q.includes(t)) return 4;
  
  const qWords = q.split(/\s+/);
  const tWords = t.split(/\s+/);
  let matches = 0;
  qWords.forEach(qw => {
    if (tWords.includes(qw)) matches++;
  });
  return matches / Math.max(1, qWords.length);
}

export default function ExploreScreen() {
  const { colors } = useAppTheme();
  const currentTrack = useCurrentTrack();
  const { openTrackOptions, openAlbumOptions, openPlaylistOptions, openArtistOptions } = useTrackOptions();
  const { isPlaying } = usePlayerState();
  const { query } = useLocalSearchParams();
  const searchInputRef = useRef<TextInput>(null);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<CategorizedSearchResults>({ songs: [], artists: [], albums: [], playlists: [] });
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [locationCity, setLocationCity] = useState<string>('');
  const [localHits, setLocalHits] = useState<YtMusicSearchResult[]>([]);
  const [localStations, setLocalStations] = useState<any[]>([]);

  // Find the dynamically best matching top result candidate
  const topResult = React.useMemo(() => {
    if (!results.songs.length && !results.artists.length && !results.albums.length && !results.playlists?.length) {
      return null;
    }
    const candidates: { type: 'song' | 'artist' | 'album' | 'playlist'; item: any; score: number }[] = [];
    
    if (results.artists.length > 0) {
      candidates.push({
        type: 'artist',
        item: results.artists[0],
        score: getSearchScore(search, results.artists[0].name || '') + 0.1,
      });
    }
    if (results.songs.length > 0) {
      candidates.push({
        type: 'song',
        item: results.songs[0],
        score: getSearchScore(search, results.songs[0].title || ''),
      });
    }
    if (results.albums.length > 0) {
      candidates.push({
        type: 'album',
        item: results.albums[0],
        score: getSearchScore(search, results.albums[0].title || ''),
      });
    }
    if (results.playlists && results.playlists.length > 0) {
      candidates.push({
        type: 'playlist',
        item: results.playlists[0],
        score: getSearchScore(search, results.playlists[0].title || ''),
      });
    }
    
    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? { type: candidates[0].type, item: candidates[0].item } : null;
  }, [results, search]);

  const playRadioStation = async (station: any) => {
    try {
      const urlParts = station.url.split('/');
      const channelId = urlParts[urlParts.length - 1];
      const streamUrl = `https://radio.garden/api/ara/content/listen/${channelId}/channel.mp3`;
      
      const trackObj = {
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

  useEffect(() => {
    const fetchLocalHits = async () => {
      let city = 'Chennai';
      let searchSuffix = 'Tamil hits';
      let placeId = '';
      
      try {
        const geoRes = await fetch('http://radio.garden/api/geo');
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData && geoData.title) {
            city = geoData.title;
            placeId = geoData.id || '';
            if (geoData.code === 'IN') {
              if (city.toLowerCase().includes('bengaluru') || city.toLowerCase().includes('bangalore')) {
                searchSuffix = 'Kannada hits';
              } else if (city.toLowerCase().includes('mumbai')) {
                searchSuffix = 'Hindi trending';
              } else if (city.toLowerCase().includes('hyderabad')) {
                searchSuffix = 'Telugu hits';
              } else if (city.toLowerCase().includes('delhi')) {
                searchSuffix = 'Punjabi hits';
              } else {
                searchSuffix = 'Tamil hits';
              }
            } else if (geoData.code === 'US') {
              searchSuffix = 'US pop hits';
            } else {
              searchSuffix = `${geoData.country} hits`;
            }
          }
        }
      } catch (err) {
        console.warn('[Explore] Failed to fetch geo location:', err);
      }
      
      setLocationCity(city);
      
      // Fetch YTMusic hits
      try {
        const res = await searchYtMusic(`${city} ${searchSuffix}`);
        if (res && res.songs) {
          setLocalHits(res.songs.slice(0, 10));
        }
      } catch (err) {
        console.warn('[Explore] Failed to fetch local songs:', err);
      }

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
            const colors = ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA'];
            const mapped = fetchedList.slice(0, 8).map((item, idx) => ({
              id: item.page?.url || String(idx),
              title: item.title || item.page?.title || 'Unknown Station',
              sub: `Live • ${city}`,
              color: colors[idx % colors.length],
              url: item.page?.url || ''
            }));
            setLocalStations(mapped);
          }
        } catch (err) {
          console.warn('[Explore] Failed to load local stations:', err);
        }
      }
    };
    
    fetchLocalHits();
  }, []);

  useEffect(() => {
    if (query && typeof query === 'string') {
      setSearch(query);
      handleSearch(query);
    }
  }, [query]);

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const data = await AsyncStorage.getItem('@bunny_recent_searches');
        if (data) {
          setRecentSearches(JSON.parse(data));
        } else {
          const defaults = ['Sabrina Carpenter', 'Lofi Beats', 'Taylor Swift'];
          setRecentSearches(defaults);
          await AsyncStorage.setItem('@bunny_recent_searches', JSON.stringify(defaults));
        }
      } catch (err) {
        console.warn('Failed to load recent searches:', err);
      }
    };
    loadRecentSearches();
  }, []);

  const saveRecentSearch = async (query: string) => {
    if (!query || query.trim() === '') return;
    const trimmed = query.trim();
    try {
      const filtered = recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 6);
      setRecentSearches(updated);
      await AsyncStorage.setItem('@bunny_recent_searches', JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save recent search:', err);
    }
  };
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const isSearchingRef = useRef(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [provider, setProvider] = useState<SearchProvider>('ytmusic');
  const [activeFilter, setActiveFilter] = useState<'all' | 'songs' | 'artists' | 'albums' | 'playlists'>('all');
  const router = useRouter();

  useEffect(() => {
    if (isSearchingRef.current) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (search.trim().length > 1) {
      const timer = setTimeout(async () => {
        if (isSearchingRef.current) return;
        try {
          const sug = await getSearchSuggestions(search);
          setSuggestions(sug);
          if (!isSearchingRef.current) setShowSuggestions(true);
        } catch (e) {
          console.error('Suggestions error', e);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [search]);

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem('@bunny_recent_searches');
    } catch (err) {
      console.warn('Failed to clear recent searches:', err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearch(query);
    setSuggestions([]);
    setShowSuggestions(false);
    setLoading(true);
    setIsSearching(true);
    isSearchingRef.current = true;
    saveRecentSearch(query);
    Keyboard.dismiss();
    try {
      if (provider === 'ytmusic') {
        const res = await searchYtMusic(query);
        setResults(res);
      } else {
        const pipedResults = await pipedService.search(query, 'all');
        const formatted: CategorizedSearchResults = {
          songs: (pipedResults.items || [])
            .filter((i: any) => (i.type === 'video' || i.type === 'stream') && i.url)
            .map((i: any) => {
              const videoId = i.url.split('v=')[1] || i.url.split('/').pop() || '';
              return {
                type: 'song',
                id: videoId,
                title: i.title,
                artist: i.uploaderName || i.uploader || 'Unknown Artist',
                thumbnail: i.thumbnail,
                duration: i.duration,
                url: `https://music.youtube.com/watch?v=${videoId}`,
                provider: 'piped',
              };
            }),
          artists: [],
          albums: [],
          playlists: [],
        };
        setResults(formatted);
      }
    } catch (e) {
      console.error('Search error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleTilePress = (item: any) => {
    if (item.type === 'album') {
      console.log("Album ID:", item);
      router.push(`/album/${item.id}` as any);
    } else if (item.type === 'playlist') {
      router.push(`/playlist/${item.id}` as any);
    } else if (item.type === 'artist') {
      router.push(`/artist/${item.id}` as any);
    } else {
      // For radio and others, trigger playback
      PlayerActions.skipToTrack(item.id.replace(/[fr]/, ''));
    }
  };

  const handleArtistShuffle = async (artistName: string) => {
    try {
      const searchRes = await searchYtMusic(artistName + " songs");
      if (searchRes.songs.length > 0) {
        const shuffled = [...searchRes.songs]
          .sort(() => Math.random() - 0.5)
          .map((s) => ({
            id: s.id,
            url: s.url || '',
            title: s.title || '',
            artist: s.artist || '',
            album: s.album || 'Single',
            artwork: s.thumbnail || '',
            duration: s.duration || 0,
          }));
        await PlayerActions.playCollection(shuffled as any);
      }
    } catch (err) {
      console.error('Artist shuffle failed:', err);
    }
  };

  const handleArtistMix = async (artistName: string) => {
    try {
      const searchRes = await searchYtMusic(artistName + " songs");
      if (searchRes.songs.length > 0) {
        const mixQueue = searchRes.songs.map((s) => ({
          id: s.id,
          url: s.url || '',
          title: s.title || '',
          artist: s.artist || '',
          album: s.album || 'Single',
          artwork: s.thumbnail || '',
          duration: s.duration || 0,
        }));
        await PlayerActions.playCollection(mixQueue as any);
      }
    } catch (err) {
      console.error('Artist mix failed:', err);
    }
  };



  const renderSearchResult = ({ item }: { item: YtMusicSearchResult }) => {
    if (item.type === 'album') {
      return (
        <AlbumRowCard
          title={item.title || item.name || ''}
          artist={item.artist || 'Unknown Artist'}
          artwork={item.thumbnail || ''}
          onPress={() => handleTilePress(item)}
          onLongPress={() => openAlbumOptions({ id: item.id, title: item.title || item.name || '', artist: item.artist || 'Unknown Artist', artwork: item.thumbnail || '' })}
        />
      );
    }

    if (item.type === 'playlist') {
      return (
        <AlbumRowCard
          title={item.title || item.name || ''}
          artist={item.artist || 'Unknown Artist'}
          artwork={item.thumbnail || ''}
          onPress={() => handleTilePress(item)}
          onLongPress={() => openPlaylistOptions({ id: item.id, name: item.title || item.name || '', artwork: item.thumbnail || '' })}
        />
      );
    }

    if (item.type === 'artist') {
      return (
        <ArtistCard
          name={item.name || item.title || ''}
          artwork={item.thumbnail || ''}
          onPress={() => handleTilePress(item)}
          onLongPress={() => openArtistOptions({ id: item.id, name: item.name || item.title || '', artwork: item.thumbnail || '' })}
        />
      );
    }

    const trackId = ((item as any).videoId || item.id) as string;
    const isActive = !!(currentTrack?.id === trackId || (currentTrack?.id && currentTrack.id.includes(trackId)));
    return (
      <SongCard
        title={item.title || item.name || ''}
        artist={item.artist ? `Song • ${item.artist}` : 'Song'}
        artwork={item.thumbnail || ''}
        rightIcon="play"
        isActive={isActive}
        isPlaying={isPlaying}
        onPress={() => PlayerActions.skipToTrackFromYt(item)}
        track={{
          id: trackId,
          title: item.title || item.name || '',
          artist: item.artist || '',
          album: item.album || 'Single',
          artwork: item.thumbnail || '',
          url: `https://music.youtube.com/watch?v=${trackId}`,
          duration: item.duration || 0,
          artistId: (item as any).artistId,
          albumId: (item as any).albumId,
        }}
      />
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Muted style={[styles.headerSub, { color: colors.primary }]}>DISCOVER</Muted>
            <H1 style={styles.headerTitle}>Explore</H1>
          </View>
        </View>

        <View style={styles.container}>
          {/* Search Bar */}
          <View style={styles.searchHeader}>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                ref={searchInputRef}
                placeholder="Search Music..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
                onFocus={() => {
                  setShowSuggestions(true);
                }}
                onSubmitEditing={() => handleSearch(search)}
                style={[styles.searchInput, { color: colors.text }]}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearch('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setIsSearching(false);
                    isSearchingRef.current = false;
                    setResults({ songs: [], artists: [], albums: [], playlists: [] });
                    setActiveFilter('all');
                  }}
                >
                  <Feather name="x" size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Suggestions Overlay */}
          <SuggestionsOverlay
            suggestions={search.trim() === '' ? recentSearches : suggestions}
            showSuggestions={showSuggestions}
            onSearch={handleSearch}
            isRecent={search.trim() === ''}
            onClearRecent={clearRecentSearches}
            onDismiss={() => {
              setShowSuggestions(false);
              Keyboard.dismiss();
              searchInputRef.current?.blur();
            }}
          />

          {isSearching ? (
            <View style={styles.resultsContainer}>
              {/* Horizontal Filter Chips */}
              <FilterChips
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
              />

              {loading ? (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.resultsList}
                  showsVerticalScrollIndicator={false}
                >
                  {[1, 2, 3, 4, 5, 6].map((k) => (
                    <View key={k} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                      <Skeleton style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <Skeleton style={{ width: '60%', height: 16, borderRadius: 4 }} />
                        <Skeleton style={{ width: '40%', height: 12, borderRadius: 4 }} />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={styles.resultsList}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Mixed/All Results Mode */}
                  {activeFilter === 'all' && (
                    <>
                      {/* Top Result Card */}
                      {topResult && (
                        <TopResultCard
                          type={topResult.type}
                          item={topResult.item}
                          recommendedSong={topResult.type === 'artist' && results.songs.length > 0 ? results.songs[0] : null}
                          onPress={() => {
                            if (topResult.type === 'artist') {
                              router.push(`/artist/${topResult.item.id}`);
                            } else if (topResult.type === 'album') {
                              router.push(`/album/${topResult.item.id}`);
                            } else if (topResult.type === 'playlist') {
                              router.push(`/playlist/${topResult.item.id}`);
                            } else {
                              PlayerActions.skipToTrackFromYt(topResult.item);
                            }
                          }}
                          onPlay={() => {
                            if (topResult.type === 'artist') {
                              handleArtistShuffle(topResult.item.name || '');
                            } else if (topResult.type === 'album') {
                              router.push(`/album/${topResult.item.id}`);
                            } else if (topResult.type === 'playlist') {
                              router.push(`/playlist/${topResult.item.id}`);
                            } else {
                              PlayerActions.skipToTrackFromYt(topResult.item);
                            }
                          }}
                          onAction={
                            topResult.type === 'artist'
                              ? () => handleArtistMix(topResult.item.name || '')
                              : topResult.type === 'song'
                              ? () => PlayerActions.skipToTrackFromYt(topResult.item)
                              : topResult.type === 'album'
                              ? () => router.push(`/album/${topResult.item.id}`)
                              : topResult.type === 'playlist'
                              ? () => router.push(`/playlist/${topResult.item.id}`)
                              : () => PlayerActions.skipToTrackFromYt(topResult.item)
                          }
                          onRecommendedSongPress={(song) => PlayerActions.skipToTrackFromYt(song)}
                        />
                      )}

                      {/* Top Songs */}
                      {results.songs.length > 0 && (
                        <View style={styles.resultsSection}>
                          <Typography variant="small" style={styles.sectionLabel}>SONGS </Typography>
                          {results.songs.slice(0, 5).map(item => (
                            <View key={item.id}>{renderSearchResult({ item })}</View>
                          ))}
                        </View>
                      )}

                      {/* Top Albums */}
                      {results.albums.length > 0 && (
                        <View style={styles.resultsSection}>
                          <Typography variant="small" style={styles.sectionLabel}>ALBUMS</Typography>
                          {results.albums.slice(0, 5).map(item => (
                            <View key={item.id}>{renderSearchResult({ item })}</View>
                          ))}
                        </View>
                      )}

                      {/* Top Playlists */}
                      {results.playlists && results.playlists.length > 0 && (
                        <View style={styles.resultsSection}>
                          <Typography variant="small" style={styles.sectionLabel}>PLAYLISTS</Typography>
                          {results.playlists.slice(0, 5).map(item => (
                            <View key={item.id}>{renderSearchResult({ item })}</View>
                          ))}
                        </View>
                      )}

                      {/* Top Artists Fallback (excluding the top result card) */}
                      {results.artists.length > 1 && (
                        <View style={styles.resultsSection}>
                          <Typography variant="small" style={styles.sectionLabel}>ARTISTS</Typography>
                          {results.artists.slice(1, 6).map(item => (
                            <View key={item.id}>{renderSearchResult({ item })}</View>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {/* Songs Filter Mode */}
                  {activeFilter === 'songs' && results.songs.length > 0 && (
                    <View style={styles.resultsSection}>
                      <Typography variant="small" style={styles.sectionLabel}>SONGS</Typography>
                      {results.songs.map(item => (
                        <View key={item.id}>{renderSearchResult({ item })}</View>
                      ))}
                    </View>
                  )}

                  {/* Artists Filter Mode */}
                  {activeFilter === 'artists' && results.artists.length > 0 && (
                    <View style={styles.resultsSection}>
                      <Typography variant="small" style={styles.sectionLabel}>ARTISTS</Typography>
                      {results.artists.map(item => (
                        <View key={item.id}>{renderSearchResult({ item })}</View>
                      ))}
                    </View>
                  )}

                  {/* Albums Filter Mode */}
                  {activeFilter === 'albums' && results.albums.length > 0 && (
                    <View style={styles.resultsSection}>
                      <Typography variant="small" style={styles.sectionLabel}>ALBUMS</Typography>
                      {results.albums.map(item => (
                        <View key={item.id}>{renderSearchResult({ item })}</View>
                      ))}
                    </View>
                  )}

                  {/* Playlists Filter Mode */}
                  {activeFilter === 'playlists' && results.playlists && results.playlists.length > 0 && (
                    <View style={styles.resultsSection}>
                      <Typography variant="small" style={styles.sectionLabel}>PLAYLISTS</Typography>
                      {results.playlists.map(item => (
                        <View key={item.id}>{renderSearchResult({ item })}</View>
                      ))}
                    </View>
                  )}

                  {/* Empty State */}
                  {((activeFilter === 'all' && results.songs.length === 0 && results.artists.length === 0 && results.albums.length === 0 && (!results.playlists || results.playlists.length === 0)) ||
                    (activeFilter === 'songs' && results.songs.length === 0) ||
                    (activeFilter === 'artists' && results.artists.length === 0) ||
                    (activeFilter === 'albums' && results.albums.length === 0) ||
                    (activeFilter === 'playlists' && (!results.playlists || results.playlists.length === 0))) && (
                    <View style={styles.center}>
                      <Muted>No results found</Muted>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >

              {/* Local Spotlight */}
              {localHits.length > 0 && (
                <View style={{ marginBottom: 32 }}>
                  <View style={styles.sectionHeader}>
                    <H2 style={styles.sectionTitle}>Local Spotlight ({locationCity})</H2>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: -20 }}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                  >
                    {localHits.map((song) => (
                      <AlbumCard
                        key={song.id}
                        title={song.title || ''}
                        subtitle={song.artist || ''}
                        artwork={song.thumbnail || ''}
                        type="album"
                        variant="carousel"
                        onPress={() => PlayerActions.skipToTrackFromYt(song)}
                        onLongPress={() => openTrackOptions({
                          id: song.id,
                          title: song.title || '',
                          artist: song.artist || '',
                          album: song.album || 'Single',
                          artwork: song.thumbnail || '',
                          url: song.url || `https://music.youtube.com/watch?v=${song.id}`,
                          duration: song.duration || 0,
                          artistId: song.artistId,
                          albumId: song.albumId,
                          artists: song.artists,
                        })}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Radio Section */}
              {localStations.length > 0 && (
                <RadioStations stations={localStations} onStationPress={playRadioStation} />
              )}

              {/* Categories Grid */}
              <MoodsGenres categories={CATEGORIES} onCategoryPress={(cat) => router.push(`/playlist/${cat.title}`)} />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  headerSub: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerTitle: {
    letterSpacing: -1,
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 40,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    flex: 1,
  },
  providerButton: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
  },
  suggestionsModal: {
    position: 'absolute',
    top: 56,
    left: 5,
    right: 0,
    bottom: 0,
    zIndex: 100,
    paddingTop: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsList: {
    paddingBottom: 140,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 30,
    paddingHorizontal: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  resultThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  resultsSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '700',
    marginBottom: 12,
    opacity: 0.5,
  },
  historyContainer: {
    marginBottom: 32,
  },
  historyLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
    opacity: 0.6,
  },
  recentScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  recentTag: {
    marginRight: 10,
    borderRadius: 12,
  },
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
  featuredCard: {
    width: 200,
    marginRight: 16,
  },
  radioCard: {
    width: 160,
    marginRight: 16,
  },
  featuredIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  radioIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridContent: {
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryCardContainer: {
    width: '48%',
  },
  categoryText: {
  },
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
  },
  topResultSection: {
    marginBottom: 24,
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
  },
  topResultAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  topResultDetails: {
    flex: 1,
    marginLeft: 16,
  },
  topResultName: {
    fontSize: 20,
    fontWeight: '700',
  },
  topResultSub: {
    fontSize: 14,
    marginTop: 2,
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
});
