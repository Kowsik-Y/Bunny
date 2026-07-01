import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { H1, Muted, Typography } from '@/components/ui/typography';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BunnyCard } from '@/components/ui/bunny-card';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/contexts/app-theme-context';

import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface AlbumHeaderProps {
  albumData: any;
  onPlayPress: () => void;
  onShufflePress: () => void;
  onHeartPress: () => void;
  onArtistPress: () => void;
  onBackPress: () => void;
  onDownloadPress?: () => void;
}

export function AlbumHeader({
  albumData,
  onPlayPress,
  onShufflePress,
  onHeartPress,
  onArtistPress,
  onBackPress,
  onDownloadPress,
}: AlbumHeaderProps) {
  const { colors } = useAppTheme();

  return (
    <>
      <SafeAreaView edges={['top']} style={styles.headerNav}>
        <Button
          variant="ghost" size="icon" onPress={onBackPress} style={{width:24,height:24}} >
          <View style={{ transform: [{ rotate: '90deg' }] }}>
            <IconSymbol name="chevron.down" size={24} color={colors.text} />
          </View>
        </Button>
      </SafeAreaView>

      <View style={styles.albumHeader}>
        <Animated.View entering={FadeInUp.duration(600)} style={styles.artworkContainer}>
          <Image source={{ uri: albumData.thumbnails?.[albumData.thumbnails.length - 1]?.url }} style={styles.artwork} />
          <BunnyCard glass style={styles.playOverlay} onPress={onPlayPress}>
            <IconSymbol name="play.fill" size={32} color={colors.primary} active />
          </BunnyCard>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)} style={styles.albumMeta}>
          <H1 numberOfLines={2} style={styles.albumTitle}>
            {albumData.name}
          </H1>
          <TouchableOpacity onPress={onArtistPress}>
            <Typography variant="lead" style={{ color: colors.primary }}>
              {typeof albumData.artist === 'string' ? albumData.artist : albumData.artist?.name}
            </Typography>
          </TouchableOpacity>
          <Muted style={styles.albumStats}>
            Album • {albumData.tracks?.length || 0} tracks • {albumData.year || 'Unknown'}
          </Muted>

          <View style={styles.actionRow}>
            <Button variant="default" style={styles.mainAction} onPress={onPlayPress}>
              <IconSymbol name="play.fill" size={20} color={colors.background} />
              <Typography style={{ color: colors.background, fontWeight: '600', marginLeft: 8 }}>Play All</Typography>
            </Button>
            <Button variant="secondary" size="icon" onPress={onShufflePress}>
              <IconSymbol name="shuffle" size={20} color={colors.primary} />
            </Button>
            <Button variant="secondary" size="icon" onPress={onHeartPress}>
              <IconSymbol name="heart" size={20} color={colors.primary} />
            </Button>
            {onDownloadPress && (
              <Button variant="secondary" size="icon" onPress={onDownloadPress}>
                <Feather name="download" size={20} color={colors.primary} />
              </Button>
            )}
          </View>
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  headerNav: {
    position: 'absolute',
    top: 20,
    left: 15,
    zIndex: 10,
  },
  albumHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 60,
  },
  artworkContainer: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
    position: 'relative',
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  playOverlay: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  albumMeta: {
    alignItems: 'center',
    width: '100%',
  },
  albumTitle: {
    textAlign: 'center',
    marginBottom: 4,
  },
  albumStats: {
    marginTop: 8,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
    alignItems: 'center',
  },
  mainAction: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    height: 50,
    borderRadius: 25,
  },
});
