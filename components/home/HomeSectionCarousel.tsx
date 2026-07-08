import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Music2, Disc3, ListMusic } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from '@/components/ui/typography';
import { Skeleton } from '@/components/ui/skeleton';
import type { HomeItem, HomeSection } from '@/services/ytmusic/home';

const CARD_WIDTH = 130;
const CARD_IMG_HEIGHT = 130;
const WIDE_CARD_WIDTH = 200;

interface HomeSectionCarouselProps {
  section: HomeSection;
  loading?: boolean;
  onPlayItem?: (item: HomeItem) => void;
}

function ExplicitBadge({ colors }: { colors: any }) {
  return (
    <View style={{ backgroundColor: colors.mutedForeground, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
      <Typography style={{ fontSize: 9, fontWeight: '800', color: colors.background, lineHeight: 11 }}>E</Typography>
    </View>
  );
}

function SongCard({ item, onPress, colors }: { item: HomeItem; onPress: () => void; colors: any }) {
  const isWide = item.type === 'album' || item.type === 'playlist';
  const cardW = isWide ? WIDE_CARD_WIDTH : CARD_WIDTH;
  const imgH = isWide ? 140 : CARD_IMG_HEIGHT;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { width: cardW }]}
    >
      <View style={[styles.thumbWrap, { width: cardW, height: imgH, borderRadius: isWide ? 12 : 8, backgroundColor: colors.muted }]}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={[StyleSheet.absoluteFill, { borderRadius: isWide ? 12 : 8 }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.thumbFallback, { borderRadius: isWide ? 12 : 8, backgroundColor: colors.card }]}>
            {item.type === 'album' ? (
              <Disc3 size={28} color={colors.mutedForeground} />
            ) : item.type === 'playlist' ? (
              <ListMusic size={28} color={colors.mutedForeground} />
            ) : (
              <Music2 size={28} color={colors.mutedForeground} />
            )}
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.titleRow}>
          <Typography numberOfLines={2} style={[styles.cardTitle, { color: colors.text }]}>
            {item.title || item.name}
          </Typography>
          {item.explicit && <ExplicitBadge colors={colors} />}
        </View>
        {item.artist && item.type !== 'artist' && (
          <Typography
            numberOfLines={1}
            style={[styles.cardArtist, { color: colors.mutedForeground }]}
          >
            {item.artist}
          </Typography>
        )}
      </View>
    </Pressable>
  );
}

function SkeletonCard({ colors }: { colors: any }) {
  return (
    <View style={[styles.card, { width: CARD_WIDTH }]}>
      <Skeleton style={{ width: CARD_WIDTH, height: CARD_IMG_HEIGHT, borderRadius: 8 }} />
      <View style={styles.cardInfo}>
        <Skeleton style={{ width: '80%', height: 12, borderRadius: 4, marginBottom: 4 }} />
        <Skeleton style={{ width: '55%', height: 10, borderRadius: 4 }} />
      </View>
    </View>
  );
}

export function HomeSectionCarousel({ section, loading, onPlayItem }: HomeSectionCarouselProps) {
  const { colors } = useAppTheme();
  const router = useRouter();

  const handlePress = useCallback((item: HomeItem) => {
    if (item.type === 'album' && item.id) {
      router.push(`/album/${item.id}` as any);
    } else if (item.type === 'playlist' && item.id) {
      router.push(`/playlist/${item.id}` as any);
    } else if (item.type === 'artist' && item.id) {
      router.push(`/artist/${item.id}` as any);
    } else {
      onPlayItem?.(item);
    }
  }, [router, onPlayItem]);

  if (loading) {
    return (
      <View style={styles.sectionWrap}>
        <Skeleton style={{ width: 140, height: 16, borderRadius: 4, marginHorizontal: 20, marginBottom: 12 }} />
        <FlatList
          horizontal
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(k) => String(k)}
          renderItem={() => <SkeletonCard colors={colors} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    );
  }

  if (!section.items.length) return null;

  return (
    <View style={styles.sectionWrap}>
      <Typography style={[styles.sectionTitle, { color: colors.text }]}>
        {section.title}
      </Typography>
      <FlatList
        horizontal
        data={section.items}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        renderItem={({ item }) => (
          <SongCard item={item} onPress={() => handlePress(item)} colors={colors} />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={6}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionWrap: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    flexShrink: 0,
  },
  thumbWrap: {
    overflow: 'hidden',
    position: 'relative',
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  cardInfo: {
    marginTop: 6,
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  cardArtist: {
    fontSize: 11,
    marginTop: 2,
  },
});
