import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Dimensions,
  Keyboard,
  Linking,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { H1, Muted, Typography as Text } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { ThemedView } from '@/components/themed-view';
import { Skeleton } from '@/components/ui/skeleton';
import TrackPlayer, { State, useActiveTrack, usePlaybackState } from 'react-native-track-player';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { type AppTrack } from '@/components/player/Tracks';
import { MapPin, Search, X, Radio, Map as MapIcon, AudioLines, Globe, Pause, Play } from 'lucide-react-native';
import { toast } from '@/services';
import { addAlpha } from '@/constants/theme';

const { height } = Dimensions.get('window');

const POPULAR_PRESETS = [
  { name: 'London', country: 'UK' },
  { name: 'New York', country: 'USA' },
  { name: 'Paris', country: 'France' },
  { name: 'Tokyo', country: 'Japan' },
  { name: 'Sydney', country: 'Australia' },
  { name: 'Dubai', country: 'UAE' },
];


export default function RadioScreen() {
  const { colors } = useAppTheme();
  const bottomSpacing = useBottomTabSpacing();
  
  // Location States
  const [locationLoading, setLocationLoading] = useState(false);
  const [currentCity, setCurrentCity] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');
  const [placeId, setPlaceId] = useState('');

  // Station States
  const [stations, setStations] = useState<any[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);

  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Track Player State Integration
  const activeTrack = useActiveTrack();
  const playback = usePlaybackState();
  const isPlaying = playback.state === State.Playing;

  async function detectLocationAndLoad() {
    setLocationLoading(true);
    setStationsLoading(true);
    try {
      const res = await fetch('https://radio.garden/api/geo', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://radio.garden/'
        }
      });
      if (!res.ok) throw new Error('Radio Garden geo request failed');
      const data = await res.json();
      const city = data.city || '';
      const regionCode = data.region_code || '';
      const country = data.country_code || 'India';
      const regionName = regionCode || '';
      
      // Search city on Radio Garden to get placeId
      const searchRes = await fetch(`https://radio.garden/api/search?q=${encodeURIComponent(city)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://radio.garden/'
        }
      });
      const searchData = await searchRes.json();
      const hits = searchData?.hits?.hits || [];
      const placeHit = hits.find((h: any) => h._source?.type === 'place');
      
      if (placeHit) {
        const title = placeHit._source.page.title;
        const subtitle = placeHit._source.page.subtitle || country;
        const urlParts = placeHit._source.page.url.split('/');
        const id = urlParts[urlParts.length - 1];
        
        setCurrentCity(regionName || title);
        setCurrentCountry(regionName ? country : subtitle);
        setPlaceId(id);
        await loadStations(id);
      } else {
        await loadDefaultCity();
      }
    } catch (e) {
      console.warn('[Radio] Location detection error:', e);
      await loadDefaultCity();
    } finally {
      setLocationLoading(false);
      setStationsLoading(false);
    }
  };

  async function loadDefaultCity() {
    setCurrentCity('Tamil Nadu');
    setCurrentCountry('IN');
    setPlaceId('jKelPaRC');
    await loadStations('jKelPaRC');
  };

  async function loadStations(id: string) {
    setStationsLoading(true);
    try {
      // 1. Fetch place detail page to find nearby places dynamically
      const pageRes = await fetch(`https://radio.garden/api/ara/content/page/${id}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://radio.garden/'
        }
      });
      const pageData = await pageRes.json();
      const pageSections = pageData?.data?.content || [];
      
      // Find "Nearby [City]" section representing the broader region/state
      const nearbySection = pageSections.find((sec: any) => sec.title && sec.title.toLowerCase().startsWith('nearby'));
      const nearbyItems = nearbySection?.items || [];
      
      // Parse nearby place IDs
      const nearbyPlaceIds = nearbyItems.map((item: any) => {
        const urlParts = item.page?.url?.split('/') || [];
        return urlParts[urlParts.length - 1];
      }).filter(Boolean);
      
      // Combine active city ID with nearby place IDs (limit to 10 to avoid rate limits)
      const idsToFetch = [id, ...nearbyPlaceIds].slice(0, 10);
      const allFetchedStations: any[] = [];
      
      await Promise.all(
        idsToFetch.map(async (placeId) => {
          try {
            const res = await fetch(`https://radio.garden/api/ara/content/page/${placeId}/channels`, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': 'https://radio.garden/'
              }
            });
            const data = await res.json();
            const sections = data?.data?.content || [];
            for (const section of sections) {
              if (section.items && (section.itemsType === 'channel' || section.type === 'list')) {
                allFetchedStations.push(...section.items);
              }
            }
          } catch (err) {
            console.warn(`[Radio] Failed to fetch channels for place ${placeId}:`, err);
          }
        })
      );

      // Deduplicate stations by title / url
      const uniqueStationsMap = new Map();
      allFetchedStations.forEach((item) => {
        const key = item.page?.url || item.title || '';
        if (key && !uniqueStationsMap.has(key)) {
          uniqueStationsMap.set(key, item);
        }
      });
      
      setStations(Array.from(uniqueStationsMap.values()));
    } catch (e) {
      console.warn('[Radio] Load stations error:', e);
      setStations([]);
    } finally {
      setStationsLoading(false);
    }
  }

  // Detect location and load stations on mount
  useEffect(() => {
    Promise.resolve().then(() => {
      detectLocationAndLoad();
    });
  }, []);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`https://radio.garden/api/search?q=${encodeURIComponent(text)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://radio.garden/'
        }
      });
      const data = await res.json();
      const hits = data?.hits?.hits || [];
      
      const results = hits
        .filter((h: any) => h._source?.type === 'place' || h._source?.type === 'channel')
        .map((h: any) => {
          const src = h._source;
          const urlParts = src.page.url.split('/');
          const id = urlParts[urlParts.length - 1];
          return {
            id,
            type: src.type,
            title: src.page.title,
            subtitle: src.page.subtitle || src.code || (src.type === 'channel' ? 'Radio Station' : 'Place'),
          };
        });
      setSearchResults(results);
    } catch (e) {
      console.warn('[Radio] Search error:', e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectSearchResult = async (item: { id: string; type: string; title: string; subtitle: string }) => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults([]);
    
    if (item.type === 'channel') {
      try {
        const streamUrl = `https://radio.garden/api/ara/content/listen/${item.id}/channel.mp3`;
        const isCurrent = activeTrack?.id === `radiogarden-${item.id}`;
        if (isCurrent) {
          if (isPlaying) {
            await TrackPlayer.pause();
          } else {
            await TrackPlayer.play();
          }
          return;
        }

        toast.success(`Tuning in to "${item.title}"...`, 2000);

        const trackObj: AppTrack = {
          id: `radiogarden-${item.id}`,
          url: streamUrl,
          title: item.title,
          artist: `Live Radio • ${item.subtitle}`,
          album: 'Radio Garden',
          duration: 0,
          artwork: 'https://radio.garden/icons/favicon.png',
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        };

        await TrackPlayer.reset();
        await TrackPlayer.add([trackObj]);
        await TrackPlayer.play();
      } catch (e: any) {
        console.warn('[Radio] selectChannel error:', e.message);
        toast.error('Failed to play radio channel');
      }
    } else {
      setCurrentCity(item.title);
      setCurrentCountry(item.subtitle);
      setPlaceId(item.id);
      await loadStations(item.id);
    }
  };

  const selectPreset = async (cityName: string, countryName: string) => {
    setStationsLoading(true);
    try {
      const searchRes = await fetch(`https://radio.garden/api/search?q=${encodeURIComponent(cityName)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Referer': 'https://radio.garden/'
        }
      });
      const searchData = await searchRes.json();
      const hits = searchData?.hits?.hits || [];
      const placeHit = hits.find((h: any) => h._source?.type === 'place');
      
      if (placeHit) {
        const title = placeHit._source.page.title;
        const subtitle = placeHit._source.page.subtitle || countryName;
        const urlParts = placeHit._source.page.url.split('/');
        const id = urlParts[urlParts.length - 1];
        
        setCurrentCity(title);
        setCurrentCountry(subtitle);
        setPlaceId(id);
        await loadStations(id);
      }
    } catch (e) {
      console.warn('[Radio] Preset selection error:', e);
    } finally {
      setStationsLoading(false);
    }
  };

  const playStation = async (station: any) => {
    try {
      const urlParts = station.page.url.split('/');
      const channelId = urlParts[urlParts.length - 1];
      const streamUrl = `https://radio.garden/api/ara/content/listen/${channelId}/channel.mp3`;
      
      const isCurrent = activeTrack?.id === `radiogarden-${channelId}`;
      if (isCurrent) {
        if (isPlaying) {
          await TrackPlayer.pause();
        } else {
          await TrackPlayer.play();
        }
        return;
      }

      toast.success(`Tuning in to "${station.title || station.page?.title}"...`, 2000);

      const trackObj: AppTrack = {
        id: `radiogarden-${channelId}`,
        url: streamUrl,
        title: station.title || station.page?.title || 'Live Broadcast',
        artist: `Live Radio • ${currentCity}, ${currentCountry}`,
        album: 'Radio Garden',
        duration: 0,
        artwork: 'https://radio.garden/icons/favicon.png',
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        website: station.page?.website || undefined,
        streamHost: station.page?.stream || undefined,
      };
      
      await TrackPlayer.reset();
      await TrackPlayer.add([trackObj]);
      await TrackPlayer.play();
    } catch (e: any) {
      console.warn('[Radio] playStation error:', e.message);
      toast.error('Failed to play radio station');
    }
  };

  const isPlayingThisStation = (station: any) => {
    if (!activeTrack || !isPlaying) return false;
    const urlParts = station.page?.url?.split('/') || [];
    const channelId = urlParts[urlParts.length - 1];
    return activeTrack.id === `radiogarden-${channelId}`;
  };

  const isCurrentStationSelected = (station: any) => {
    if (!activeTrack) return false;
    const urlParts = station.page?.url?.split('/') || [];
    const channelId = urlParts[urlParts.length - 1];
    return activeTrack.id === `radiogarden-${channelId}`;
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Muted style={[styles.headerSub, { color: colors.primary }]}>LIVE BROADCAST</Muted>
              <H1>World Radio</H1>
            </View>
            <TouchableOpacity
              onPress={detectLocationAndLoad}
              disabled={locationLoading}
              style={{
                backgroundColor: addAlpha(colors.primary, 0.1),
                padding: 10,
                borderRadius: 20,
              }}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MapPin size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Search size={18} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search for a city or country..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.text }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <X size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Results Dropdown Overlay */}
        {searchQuery.length > 0 && (
          <View style={[styles.searchResultsOverlay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {searchLoading ? (
              <View style={{ padding: 16, gap: 12 }}>
                {[1, 2, 3].map((k) => (
                  <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Skeleton style={{ width: 16, height: 16, borderRadius: 8 }} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Skeleton style={{ width: '70%', height: 14, borderRadius: 4 }} />
                      <Skeleton style={{ width: '45%', height: 10, borderRadius: 4 }} />
                    </View>
                  </View>
                ))}
              </View>
            ) : searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    android_ripple={{
                      color: colors.border
                    }}
                    onPress={() => selectSearchResult(item)}
                    style={[styles.searchResultItem, { borderBottomColor: colors.border }]}
                  >
                    {item.type === 'channel' ? (
                      <Radio
                        size={16}
                        color={colors.primary}
                        style={{ marginRight: 10 }}
                      />
                    ) : (
                      <MapIcon
                        size={16}
                        color={colors.primary}
                        style={{ marginRight: 10 }}
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{item.title}</Text>
                      <Text style={{ color: colors.mutedForeground, fontSize: 12 }} numberOfLines={1}>{item.subtitle}</Text>
                    </View>
                  </Pressable>
                )}
              />
            ) : (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: colors.mutedForeground }}>{`No results found matching "${searchQuery}"`}</Text>
              </View>
            )}
          </View>
        )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSpacing + 20 }]}
        >
          {/* Preset Chips */}
          <View style={{ marginBottom: 20 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
              {POPULAR_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.name}
                  onPress={() => selectPreset(preset.name, preset.country)}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                    currentCity.toLowerCase() === preset.name.toLowerCase() && {
                      backgroundColor: addAlpha(colors.primary, 0.15),
                      borderColor: colors.primary,
                    }
                  ]}
                >
                  <Text
                    style={[
                      { color: colors.text, fontSize: 13, fontWeight: '600' },
                      currentCity.toLowerCase() === preset.name.toLowerCase() && { color: colors.primary }
                    ]}
                  >
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Active Location Info Banner */}
          <View style={[styles.locationBanner, { backgroundColor: addAlpha(colors.primary, 0.05) }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.mutedForeground, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
                Active Region
              </Text>
              <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 }}>
                {currentCity ? `${currentCity}, ${currentCountry}` : 'Detecting Location...'}
              </Text>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, marginTop: 4 }}>
                {stationsLoading ? 'Updating stations...' : `${stations.length} radio stations live`}
              </Text>
            </View>
            {stationsLoading && <ActivityIndicator color={colors.primary} />}
          </View>

          {/* Stations List */}
          <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
            {stationsLoading ? (
              <View style={{ gap: 12 }}>
                {[1, 2, 3, 4, 5].map((k) => (
                  <View
                    key={k}
                    style={{
                      height: 72,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      padding: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12
                    }}
                  >
                    <Skeleton style={{ width: 40, height: 40, borderRadius: 20 }} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Skeleton style={{ width: '55%', height: 16, borderRadius: 4 }} />
                      <Skeleton style={{ width: '35%', height: 12, borderRadius: 4 }} />
                    </View>
                    <Skeleton style={{ width: 32, height: 32, borderRadius: 16 }} />
                  </View>
                ))}
              </View>
            ) : stations.length > 0 ? (
              stations.map((item, index) => {
                const isSelected = isCurrentStationSelected(item);
                const isCurrentPlaying = isPlayingThisStation(item);
                return (
                  <TouchableOpacity
                    key={item.page?.url || index}
                    onPress={() => playStation(item)}
                    style={[
                      styles.stationCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isSelected && { borderColor: colors.primary, borderWidth: 1 }
                    ]}
                  >
                    <View style={[styles.stationIconContainer, { backgroundColor: isSelected ? addAlpha(colors.primary, 0.1) : addAlpha(colors.text, 0.05) }]}>
                      {isCurrentPlaying ? (
                        <AudioLines size={24} color={colors.primary} />
                      ) : (
                        <Radio size={24} color={isSelected ? colors.primary : colors.mutedForeground} />
                      )}
                    </View>

                    <View style={styles.stationInfo}>
                      <Text style={[styles.stationTitle, { color: colors.text }]} numberOfLines={1}>
                        {item.title || item.page?.title || 'Unknown Station'}
                      </Text>
                      <Text style={[styles.stationSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {item.page?.stream || 'Radio Garden Link'}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 10 }}>
                      {item.page?.website && (
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            Linking.openURL(item.page.website);
                          }}
                          style={{
                            marginRight: 8,
                            padding: 6,
                          }}
                        >
                          <Globe size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                      <View
                        style={[
                          styles.playButton,
                          { backgroundColor: isSelected ? colors.primary : addAlpha(colors.text, 0.1) }
                        ]}
                      >
                        {isCurrentPlaying ? (
                          <Pause
                            size={16}
                            color={isSelected ? colors.background : colors.text}
                          />
                        ) : (
                          <Play
                            size={16}
                            color={isSelected ? colors.background : colors.text}
                          />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                <Radio size={48} color={colors.mutedForeground} style={{ opacity: 0.5 }} />
                <Text style={{ color: colors.mutedForeground, marginTop: 12, textAlign: 'center' }}>
                  No live radio stations found in this location.{'\n'}Try selecting a preset city above or searching.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 },
  headerSub: { fontSize: 11, letterSpacing: 2, fontWeight: '700', marginBottom: 2 },
  searchContainer: { paddingHorizontal: 20, marginBottom: 16 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  searchResultsOverlay: {
    position: 'absolute',
    top: 150,
    left: 20,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 250,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  scrollContent: { paddingTop: 4 },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  locationBanner: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  stationIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stationTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  stationSub: {
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
