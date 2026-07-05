import { StyleSheet, View, Dimensions, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Typography, Muted } from '@/components/ui/typography';
import { Moon, FastForward, MessageSquare, Settings, Shuffle, HelpCircle } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';

const { width } = Dimensions.get('window');
const TILE = (width - 52) / 2;

interface MoodMixItem {
  id: string;
  title: string;
  color: string;
  icon: string;
  desc: string;
}

interface MoodMixesGridProps {
  mixes: MoodMixItem[];
  onMixPress: (mix: MoodMixItem) => void;
}

const iconMap: { [key: string]: React.ComponentType<any> } = {
  'moon.fill': Moon,
  'forward.fill': FastForward,
  'quote.bubble': MessageSquare,
  'gearshape.fill': Settings,
  'shuffle': Shuffle,
};

export function MoodMixesGrid({ mixes, onMixPress }: MoodMixesGridProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <Typography numberOfLines={1} style={[styles.sectionTitle, { color: colors.text, flexShrink: 0 }]}>
          Vibe Check
        </Typography>
        <Muted numberOfLines={1} style={{ fontSize: 12, flexShrink: 1, marginLeft: 8 }}>Pick your mood</Muted>
      </View>

      {/* 2-column grid */}
      <View style={styles.grid}>
        {mixes.map((mix, i) => (
          <Animated.View
            key={mix.id}
            entering={FadeInDown.delay(80 + i * 55).duration(350)}
            style={{ width: TILE }}
          >
            <Pressable
              onPress={() => onMixPress(mix)}
              android_ripple={{
                color: addAlpha(mix.color, 0.4),
                foreground: true
              }}
              style={[styles.tile, { backgroundColor: mix.color }]}
            >
              {/* Large ghost icon in corner */}
              <View style={styles.ghostIcon}>
                {(() => {
                  const Icon = iconMap[mix.icon] || HelpCircle;
                  return <Icon size={52} color="rgba(0,0,0,0.12)" fill={mix.icon === 'moon.fill' ? 'rgba(0,0,0,0.12)' : 'none'} />;
                })()}
              </View>

              {/* Small icon */}
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(0,0,0,0.15)' }]}>
                {(() => {
                  const Icon = iconMap[mix.icon] || HelpCircle;
                  return <Icon size={18} color="#fff" fill={mix.icon === 'moon.fill' ? '#fff' : 'none'} />;
                })()}
              </View>

              <View style={styles.tileInfo}>
                <Typography style={styles.tileTitle}>{mix.title}</Typography>
                <Typography style={styles.tileDesc}>{mix.desc}</Typography>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tile: {
    borderRadius: 20,
    padding: 16,
    height: 110,
    overflow: 'hidden',
    justifyContent: 'space-between',
    position: 'relative',
  },
  ghostIcon: {
    position: 'absolute',
    right: -8,
    top: -8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  tileInfo: {
    gap: 1,
  },
  tileTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  tileDesc: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '500',
  },
});
