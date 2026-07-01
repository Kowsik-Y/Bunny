import { StyleSheet, View } from 'react-native';
import { Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';

export function GreetingHeader() {
  const { colors } = useAppTheme();
  const hour = new Date().getHours();

  let timeLabel = 'Morning';
  if (hour >= 12 && hour < 17) timeLabel = 'Afternoon';
  else if (hour >= 17) timeLabel = 'Evening';

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View>
          <Typography style={[styles.timeLabel, { color: colors.mutedForeground }]}>
            GOOD
          </Typography>
          <Typography style={[styles.headline, { color: colors.text }]}>
            {timeLabel}
          </Typography>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headline: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 3,
    lineHeight: 36
  }
});
