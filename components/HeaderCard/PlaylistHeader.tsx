import { type AppTrack } from '@/components/player/Tracks';
import { Button } from '@/components/ui/button';
import { H1, Muted, Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, Heart, Pause, Play, Shuffle, Share2, Plus, User, Check, FolderPlus, XCircle } from 'lucide-react-native';
import { Dimensions, Image, StyleSheet, View, ScrollView, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface PlaylistHeaderProps {
  // --- shared ---
  name: string;
  artworkUrl?: string | null;
  onPlayPress: () => void;
  onShufflePress: () => void;
  onDownloadPress?: () => void;
  isPlaying?: boolean;
  onSharePress?: () => void;
  onSavePlaylistPress?: () => void;
  onGoToArtistPress?: () => void;

  // --- playlist mode ---
  tracks?: AppTrack[];
  totalDuration?: number;

  // --- album mode ---
  subtitle?: string;           // e.g. "Album • 12 tracks • 2023"
  onArtistPress?: () => void;  // shows artist name as a tappable link
  artistName?: string;
  onAddToLibraryPress?: () => void;
  isAddedToLibrary?: boolean;
  isLikedMusic?: boolean;
  downloadStatus?: 'default' | 'downloading' | 'downloaded';
  downloadProgress?: number;
  onPauseDownloadsPress?: () => void;
  onCancelDownloadsPress?: () => void;
  isDownloadsPaused?: boolean;
}

export function PlaylistHeader({
  name,
  artworkUrl,
  onPlayPress,
  onShufflePress,
  onDownloadPress,
  isPlaying = false,
  tracks = [],
  totalDuration,
  subtitle,
  onArtistPress,
  artistName,
  onAddToLibraryPress,
  isAddedToLibrary = false,
  isLikedMusic = false,
  onSharePress,
  onSavePlaylistPress,
  onGoToArtistPress,
  downloadStatus = 'default',
  downloadProgress = 0,
  onPauseDownloadsPress,
  onCancelDownloadsPress,
  isDownloadsPaused = false,
}: PlaylistHeaderProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';

  return (
    <>
      <View style={styles.header}>
        {/* Apple Music Style Ambient Background Glow */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {isLikedMusic ? (
            <LinearGradient
              colors={['#8E2DE2', '#4A00E0']}
              style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.28 : 0.16 }]}
            />
          ) : artworkUrl && artworkUrl.trim() !== '' ? (
            <Image
              source={{ uri: artworkUrl }}
              style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.35 : 0.24 }]}
              blurRadius={65}
            />
          ) : tracks.length > 0 && tracks[0].artwork ? (
            <Image
              source={{ uri: tracks[0].artwork }}
              style={[StyleSheet.absoluteFill, { opacity: isDark ? 0.35 : 0.24 }]}
              blurRadius={65}
            />
          ) : null}
          <LinearGradient
            colors={['transparent', colors.background]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Artwork — glass frame matching bottom nav bar */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.artworkWrapper}>
          {/* Outer bevel rim gradient */}
          <LinearGradient
            colors={
              isDark
                ? ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']
                : ['#FFFFFF', 'rgba(0,0,0,0.12)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.outerGradient}
          >
            {/* Inner frosted glass surface */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(24,24,26,0.72)', 'rgba(38,38,41,0.72)']
                  : ['rgba(255,255,255,0.5)', 'rgba(255,255,255,0.85)']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.innerGradient}
            >
              {/* Blur layer */}
              <BlurView
                intensity={60}
                tint={isDark ? 'dark' : 'light'}
                style={StyleSheet.absoluteFill}
              />
              {/* Actual artwork */}
              <View style={styles.artworkContainer}>
                {isLikedMusic ? (
                  <LinearGradient
                    colors={['#8E2DE2', '#4A00E0']}
                    style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
                  >
                    <Heart size={64} color="#ffffff" fill="#ffffff" />
                  </LinearGradient>
                ) : artworkUrl && artworkUrl.trim() !== '' ? (
                  <Image source={{ uri: artworkUrl }} style={styles.artwork} />
                ) : tracks.length > 0 ? (
                  <View style={styles.gridArtwork}>
                    {tracks.slice(0, 4).map((t, i) => (
                      <Image
                        key={i}
                        source={
                          t.artwork && t.artwork.trim() !== ''
                            ? { uri: t.artwork }
                            : require('@/assets/images/icon.png')
                        }
                        style={styles.gridImage}
                      />
                    ))}
                  </View>
                ) : (
                  <Image source={require('@/assets/images/icon.png')} style={styles.artwork} />
                )}
              </View>
            </LinearGradient>
          </LinearGradient>
        </Animated.View>

        {/* Meta */}
        <View style={styles.meta}>
          <H1 numberOfLines={2} style={styles.title}>
            {name}
          </H1>

          {/* Artist link — album mode only */}
          {artistName && onArtistPress && (
            <Button variant="link" style={{ padding: 0, height: 20, width: "100%" }} onPress={onArtistPress}>
              <Typography variant="lead" style={{ color: colors.primary }}>
                {artistName}
              </Typography>
            </Button>
          )}

          {/* Subtitle / stats */}
          {subtitle ? (
            <Muted style={styles.stats}>{subtitle}</Muted>
          ) : totalDuration !== undefined ? (
            <Muted style={styles.stats}>
              {tracks.length} tracks • {Math.floor(totalDuration / 60)} min
            </Muted>
          ) : null}

          {/* Action row wrapped in a horizontal ScrollView to support premium action rows without wrap/overflow */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.actionRowContainer}
            style={styles.actionRowScrollView}
          >
            <Button variant="default" style={styles.mainAction} onPress={onPlayPress}>
              {isPlaying ? (
                <Pause size={20} color={colors.background} fill={colors.background} />
              ) : (
                <Play size={20} color={colors.background} fill={colors.background} />
              )}
              <Typography style={{ color: colors.background, fontWeight: '600', marginLeft: 8 }}>
                {isPlaying ? 'Pause' : 'Play'}
              </Typography>
            </Button>

            <Button variant="secondary" size="icon" onPress={onShufflePress}>
              <Shuffle size={20} color={colors.primary} />
            </Button>

            {onAddToLibraryPress && !isAddedToLibrary && (
              <Button variant="secondary" size="icon" onPress={onAddToLibraryPress}>
                <FolderPlus size={20} color={colors.primary} />
              </Button>
            )}

            {onSavePlaylistPress && (
              <Button variant="secondary" size="icon" onPress={onSavePlaylistPress}>
                <Plus size={20} color={colors.primary} />
              </Button>
            )}

            {downloadStatus === 'downloading' ? (
              <View style={[
                styles.combinedDownloadPill,
                {
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                }
              ]}>
                <View style={styles.downloadProgressWrapper}>
                  <Typography style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}>
                    {Math.round(downloadProgress * 100)}%
                  </Typography>
                </View>
                <View style={[styles.verticalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />
                {onPauseDownloadsPress && (
                  <Pressable
                    style={styles.combinedPillButton}
                    onPress={onPauseDownloadsPress}
                    android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
                  >
                    {isDownloadsPaused ? (
                      <Play size={16} color={colors.primary} />
                    ) : (
                      <Pause size={16} color={colors.primary} />
                    )}
                  </Pressable>
                )}
                <View style={[styles.verticalDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />
                {onCancelDownloadsPress && (
                  <Pressable
                    style={styles.combinedPillButton}
                    onPress={onCancelDownloadsPress}
                    android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
                  >
                    <XCircle size={16} color="#FF3B30" />
                  </Pressable>
                )}
              </View>
            ) : (
              onDownloadPress && (
                <Button
                  variant="secondary"
                  size="icon"
                  onPress={onDownloadPress}
                >
                  {downloadStatus === 'downloaded' ? (
                    <Check size={20} color={colors.primary} />
                  ) : (
                    <Download size={20} color={colors.primary} />
                  )}
                </Button>
              )
            )}

            {onSharePress && (
              <Button variant="secondary" size="icon" onPress={onSharePress}>
                <Share2 size={20} color={colors.primary} />
              </Button>
            )}

            {onGoToArtistPress && (
              <Button variant="secondary" size="icon" onPress={onGoToArtistPress}>
                <User size={20} color={colors.primary} />
              </Button>
            )}
          </ScrollView>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 150,
  },
  artworkWrapper: {
    width: width * 0.65,
    height: width * 0.65,
    marginBottom: 24,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 40,
  },
  outerGradient: {
    flex: 1,
    borderRadius: 28,
    padding: 3,      // border ring thickness
    overflow: 'hidden',
  },
  innerGradient: {
    flex: 1,
    borderRadius: 25,
    padding: 0,      // image fills full — no inset gap
    overflow: 'hidden',
  },
  artworkContainer: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  gridArtwork: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
  },
  gridImage: {
    width: '50%',
    height: '50%',
  },
  meta: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  stats: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  actionRowScrollView: {
    width: '100%',
    marginTop: 20,
  },
  actionRowContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mainAction: {
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 20,
  },
  combinedDownloadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  downloadProgressWrapper: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  verticalDivider: {
    width: 1,
    height: 20,
  },
  combinedPillButton: {
    height: '100%',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
