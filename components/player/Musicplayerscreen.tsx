import React, { useMemo, useState } from 'react';
import {
    View, FlatList, TouchableOpacity,
    Image, StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import tracks, { type AppTrack } from './Tracks';
import { PlayerActions, useCurrentTrack, usePlayerState } from '@/services';
import { useBottomTabSpacing } from '@/hooks/use-bottom-tab-spacing';
import { ThemedView } from '@/components/themed-view';
import { Typography, H1, Muted } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
    downloadYtMusic,
    resolveYtMusic,
    searchYtMusic,
    type YtMusicSearchResult,
    type YtMusicResolve,
} from '@/services/ytMusic';

const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    return `${m}:${ss < 10 ? '0' : ''}${ss}`;
};

const toLibraryTrack = (
    result: YtMusicSearchResult,
    resolved: YtMusicResolve,
    urlOverride?: string
): AppTrack => ({
    id: `yt-${resolved.id}`,
    url: urlOverride ?? resolved.streamUrl,
    title: resolved.title ?? result.title ?? 'Unknown Title',
    artist: resolved.artist ?? result.artist ?? 'YouTube Music',
    album: 'YouTube Music',
    duration: resolved.duration ?? result.duration ?? 0,
    artwork: resolved.thumbnail ?? result.thumbnail ?? 'https://picsum.photos/seed/ytmusic/400/400',
    headers: resolved.headers,
    userAgent: resolved.userAgent,
});

// ─── Track Row ─────────────────────────────────────────────────────────
const TrackRow = ({
    track,
    isActive,
    isPlaying,
    onPress,
}: {
    track: AppTrack;
    isActive: boolean;
    isPlaying: boolean;
    onPress: () => void;
}) => {
    const { colors } = useAppTheme();
    return (
        <TouchableOpacity
            style={[styles.row, isActive && { backgroundColor: addAlpha(colors.accent, 0.12) }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Image source={{ uri: track.artwork as string }} style={styles.rowArt} />
            <View style={styles.rowInfo}>
                <Typography numberOfLines={1} style={[styles.rowTitle, isActive && { color: colors.primary, fontWeight: '700' }]}>
                    {track.title}
                </Typography>
                <Muted numberOfLines={1}>{track.artist} · {track.album}</Muted>
            </View>
            {isActive ? (
                <Feather
                    name={isPlaying ? 'pause-circle' : 'play-circle'}
                    size={24}
                    color={colors.primary}
                />
            ) : (
                <Muted style={styles.rowDur}>{fmt(track.duration ?? 0)}</Muted>
            )}
        </TouchableOpacity>
    );
};

const ResultRow = ({
    result,
    onPlay,
    onDownload,
    loading,
}: {
    result: YtMusicSearchResult;
    onPlay: () => void;
    onDownload: () => void;
    loading?: boolean;
}) => {
    const { colors } = useAppTheme();
    return (
        <View style={styles.resultRow}>
            <Image
                source={{ uri: result.thumbnail ?? 'https://picsum.photos/seed/ytmusic/400/400' }}
                style={styles.rowArt}
            />
            <View style={styles.rowInfo}>
                <Typography numberOfLines={1} style={styles.rowTitle}>
                    {result.title}
                </Typography>
                <Muted numberOfLines={1}>
                    {result.artist ?? 'YouTube Music'} · {fmt(result.duration ?? 0)}
                </Muted>
            </View>
            <View style={styles.resultActions}>
                <IconButton
                    variant="secondary"
                    icon={<Feather name="play" size={16} color={colors.secondaryForeground} />}
                    onPress={onPlay}
                />
                <View style={{ width: 8 }} />
                <IconButton
                    variant="outline"
                    loading={loading}
                    icon={<Feather name="download" size={16} color={colors.text} />}
                    onPress={onDownload}
                />
            </View>
        </View>
    );
};

// ─── Main Screen ───────────────────────────────────────────────────────
export default function MusicPlayerScreen() {
    const { isPlaying } = usePlayerState();
    const currentTrack = useCurrentTrack();
    const { colors } = useAppTheme();
    const bottomSpacing = useBottomTabSpacing();
    const [libraryTracks, setLibraryTracks] = useState<AppTrack[]>(tracks);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<YtMusicSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [downloadId, setDownloadId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const trackCountLabel = useMemo(() => `${libraryTracks.length} tracks`, [libraryTracks.length]);

    const handlePlayTrack = async (track: AppTrack) => {
        await PlayerActions.skipToTrack(track.id as string);
    };

    const handleSearch = async () => {
        const q = searchQuery.trim();
        if (!q) return;
        setError(null);
        setIsSearching(true);
        try {
            const results = await searchYtMusic(q);
            setSearchResults(results.songs);
        } catch (err) {
            console.error(err);
            setError('Search failed. Check your server URL and try again.');
        } finally {
            setIsSearching(false);
        }
    };

    const upsertLibraryTrack = (track: AppTrack) => {
        setLibraryTracks((prev) => {
            const exists = prev.some((t) => String(t.id) === String(track.id));
            if (exists) return prev;
            return [track, ...prev];
        });
    };

    const handlePlayResult = async (result: YtMusicSearchResult) => {
        if (!result.url) return;
        setError(null);
        try {
            const resolved = await resolveYtMusic(result.url);
            const track = toLibraryTrack(result, resolved);
            await PlayerActions.addTrack(track, true);
            upsertLibraryTrack(track);
        } catch (err) {
            console.error(err);
            setError('Play failed. Check the server and try again.');
        }
    };

    const handleDownloadResult = async (result: YtMusicSearchResult) => {
        if (!result.url) return;
        setError(null);
        setDownloadId(result.id);
        try {
            const resolved = await resolveYtMusic(result.url);
            const localUri = await downloadYtMusic(
                resolved.streamUrl,
                resolved.title ?? result.title ?? 'Unknown Title',
                resolved.ext ?? 'm4a'
            );
            const track = toLibraryTrack(result, resolved, localUri);
            await PlayerActions.addTrack(track, false);
            upsertLibraryTrack(track);
        } catch (err) {
            console.error(err);
            setError('Download failed. Check the server and try again.');
        } finally {
            setDownloadId(null);
        }
    };

    return (
        <ThemedView style={styles.screen}>
            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                {/* ── Track list ─────────────────────────────────────────── */}
                <FlatList
                    data={libraryTracks}
                    keyExtractor={(t) => t.id as string}
                    contentContainerStyle={{ paddingBottom: bottomSpacing + 20 }}
                    ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
                    ListHeaderComponent={
                        <View>
                            {/* ── Header ─────────────────────────────────────────────── */}
                            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                                <View>
                                    <Typography variant="small" style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1.5 }}>YOUR LIBRARY</Typography>
                                    <H1>Music</H1>
                                </View>
                                <TouchableOpacity style={[styles.searchBtn, { backgroundColor: addAlpha(colors.accent, 0.18) }]}>
                                    <Feather name="search" size={22} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            {/* Track count badge */}
                            <View style={styles.badge}>
                                <Feather name="music" size={12} color={colors.primary} />
                                <Muted>  {trackCountLabel}</Muted>
                            </View>

                            {/* ── Search ─────────────────────────────────────────── */}
                            <View style={styles.searchSection}>
                                <Input
                                    placeholder="Search YouTube Music"
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    returnKeyType="search"
                                    onSubmitEditing={handleSearch}
                                />
                                <Button
                                    label="Search YouTube Music"
                                    onPress={handleSearch}
                                    loading={isSearching}
                                />
                                {error ? <Muted style={styles.errorText}>{error}</Muted> : null}
                            </View>

                            {/* ── Results ─────────────────────────────────────── */}
                            {searchResults.length > 0 ? (
                                <View style={styles.resultsSection}>
                                    <Typography variant="small" style={{ color: colors.primary, fontWeight: '700', letterSpacing: 1.5 }}>
                                        RESULTS
                                    </Typography>
                                    {searchResults.map((result) => (
                                        <ResultRow
                                            key={result.id}
                                            result={result}
                                            onPlay={() => handlePlayResult(result)}
                                            onDownload={() => handleDownloadResult(result)}
                                            loading={downloadId === result.id}
                                        />
                                    ))}
                                </View>
                            ) : null}
                        </View>
                    }
                    renderItem={({ item }) => (
                        <TrackRow
                            track={item}
                            isActive={currentTrack?.id === item.id}
                            isPlaying={isPlaying}
                            onPress={() => handlePlayTrack(item)}
                        />
                    )}
                />
            </SafeAreaView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    searchBtn: {
        padding: 10,
        borderRadius: 14,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    rowArt: {
        width: 52,
        height: 52,
        borderRadius: 8,
        marginRight: 14,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    rowInfo: { flex: 1, marginRight: 8 },
    rowTitle: { fontSize: 15, fontWeight: '500' },
    rowDur: { fontSize: 12 },
    sep: { height: StyleSheet.hairlineWidth, marginLeft: 82 },
    searchSection: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    resultsSection: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    resultActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    errorText: {
        marginTop: 6,
    },
});
