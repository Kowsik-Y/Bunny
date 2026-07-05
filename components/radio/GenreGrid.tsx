import { StyleSheet, View, ActivityIndicator, Dimensions } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { H2, Typography } from '@/components/ui/typography';
import { BunnyCard } from '@/components/ui/bunny-card';
import * as LucideIcons from 'lucide-react-native';

const { width } = Dimensions.get('window');

const getLucideIcon = (name: string) => {
  const mapping: Record<string, keyof typeof LucideIcons> = {
    'music.note': 'Music',
    'music.note.list': 'ListMusic',
    'antenna.radiowaves.left.and.right': 'Radio',
    'house.fill': 'Home',
    'paperplane.fill': 'Compass',
    'gearshape.fill': 'Settings',
    'heart': 'Heart',
    'moon.fill': 'Moon',
    'quote.bubble': 'MessageSquare',
    'airplayaudio': 'Radio',
    'music': 'Music',
    'dumbbell': 'Dumbbell',
    'compass': 'Compass',
    'party-popper': 'PartyPopper',
    'party': 'PartyPopper',
    'sleep': 'Moon',
    'moon': 'Moon',
    'romance': 'Heart',
    'travel': 'Plane',
    'plane': 'Plane',
    'gaming': 'Gamepad2',
    'gamepad-2': 'Gamepad2',
    'workout': 'Dumbbell',
    'chill': 'Music',
    'focus': 'Compass',
  };

  const mappedName = mapping[name.toLowerCase()] || name;
  let IconComponent = (LucideIcons as any)[mappedName];
  if (IconComponent) return IconComponent;

  const titleCase = mappedName.charAt(0).toUpperCase() + mappedName.slice(1);
  IconComponent = (LucideIcons as any)[titleCase];
  if (IconComponent) return IconComponent;

  return LucideIcons.Music;
};

interface GenreItem {
  id: string;
  title: string;
  color: string;
  icon: string;
}

interface GenreGridProps {
  genres: GenreItem[];
  loadingGenre: string | null;
  onStartGenreRadio: (genreTitle: string) => void;
}

export function GenreGrid({
  genres,
  loadingGenre,
  onStartGenreRadio,
}: GenreGridProps) {
  return (
    <View style={styles.section}>
      <H2 style={styles.sectionTitle}>Browse Genres</H2>
      <View style={styles.genreGrid}>
        {genres.map((genre, i) => (
          <Animated.View key={genre.id} entering={FadeInRight.delay(200 + i * 50)} style={styles.genreItem}>
            <BunnyCard
              tintColor={genre.color}
              style={[styles.genreCard, loadingGenre === genre.title && { opacity: 0.7 }]}
              onPress={() => onStartGenreRadio(genre.title)}
            >
              <View style={[styles.genreIcon, { backgroundColor: genre.color + '30' }]}>
                {loadingGenre === genre.title ? (
                  <ActivityIndicator size="small" color={genre.color} />
                ) : (
                  (() => {
                    const IconComponent = getLucideIcon(genre.icon);
                    return <IconComponent size={20} color={genre.color} />;
                  })()
                )}
              </View>
              <Typography variant="large" style={styles.genreTitle} numberOfLines={1}>
                {genre.title}
              </Typography>
            </BunnyCard>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
    gap: 12,
  },
  genreItem: {
    width: (width - 40) / 2 - 6,
  },
  genreCard: {
    padding: 16,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  genreIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreTitle: {
    flex: 1,
    fontWeight: '600',
  },
});
