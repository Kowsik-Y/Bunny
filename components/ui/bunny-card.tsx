import { useAppTheme } from '@/contexts/app-theme-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, View, ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface BunnyCardProps extends ViewProps {
  tintColor?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  glass?: boolean;
  elevated?: boolean;
  contentContainerStyle?: ViewProps['style'];
}

export function BunnyCard({
  children,
  style,
  tintColor,
  onPress,
  onLongPress,
  glass = true,
  elevated = true,
  contentContainerStyle,
  ...props
}: BunnyCardProps) {
  const { colors, colorScheme } = useAppTheme();
  const isDark = colorScheme === 'dark';
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress || onLongPress) {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 200 });
    }
  };

  const handlePressOut = () => {
    if (onPress || onLongPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 200 });
    }
  };

  const ContentWrapper = (onPress || onLongPress) ? Pressable : View;

  const rimColors: [string, string] = isDark
    ? (tintColor ? [tintColor, 'rgba(0,0,0,0.5)'] : ['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.08)'])
    : (tintColor ? ['#FFFFFF', `${tintColor}40`] : ['#FFFFFF', colors.border]);

  const innerColors: [string, string] = isDark
    ? (tintColor
      ? [`${tintColor}10`, 'rgba(0,0,0,0.85)']
      : (glass ? ['rgba(0, 0, 0, 0.45)', 'rgba(255, 255, 255, 0.05)'] : ['#151517', '#252529']))
    : (tintColor
      ? [`${tintColor}05`, '#FFFFFF']
      : (glass ? ['rgba(0, 0, 0, 0.06)', 'rgba(255, 255, 255, 0.95)'] : ['#E2E2E6', '#FFFFFF']));

  const shadowStyle = elevated ? styles.shadow : null;

  return (
    <Animated.View style={[animatedStyle, shadowStyle, style]}>
      <ContentWrapper
        onPress={onPress}
        onLongPress={onLongPress || onPress}
        delayLongPress={250}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.cardWrapper}
        {...props}
      >
        <LinearGradient
          colors={rimColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.cardOuter}
        >
          <LinearGradient
            colors={innerColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cardInner}
          >
            {glass && (
              <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 22.8 }]} pointerEvents="none">
                <BlurView
                  intensity={isDark ? 30 : 65}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                />
              </View>
            )}
            <View style={[styles.innerContent, contentContainerStyle]}>
              {children}
            </View>
          </LinearGradient>
        </LinearGradient>
      </ContentWrapper>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 24,
  },
  cardOuter: {
    borderRadius: 24,
    padding: 1.2,
    overflow: 'hidden',
  },
  cardInner: {
    borderRadius: 22.8,
    overflow: 'hidden',
  },
  innerContent: {
    padding: 20,
  },
  shadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 6px 12px rgba(0,0,0,0.08)',
      }
    }),
  },
});
