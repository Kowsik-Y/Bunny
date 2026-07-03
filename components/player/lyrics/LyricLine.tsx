import React, { useEffect, useMemo } from 'react';
import Reanimated, {
  Easing as ReEasing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { Typography as Text } from '@/components/ui/typography';
import AnimatedWord from './AnimatedWord';

interface LyricLineProps {
  text: string;
  isActive: boolean;
  isPast: boolean;
  startTime: number;
  endTime: number;
  smoothPosition: SharedValue<number>;
  fontSize: number;
  spacingVal: number;
}

const LyricLine = React.memo(({
  text,
  isActive,
  isPast,
  startTime,
  endTime,
  smoothPosition,
  fontSize,
  spacingVal,
}: LyricLineProps) => {
  const lineHeight = fontSize * spacingVal;

  const lineOpacity = useSharedValue(isActive ? 1 : 0.28);
  const lineScale = useSharedValue(isActive ? 1 : 0.98);

  useEffect(() => {
    lineOpacity.value = withTiming(
      isActive ? 1 : isPast ? 0.22 : 0.35,
      { duration: 150, easing: ReEasing.out(ReEasing.cubic) }
    );
    lineScale.value = withSpring(
      isActive ? 1 : 0.98,
      { damping: 18, stiffness: 140 }
    );
  }, [isActive, isPast]);

  const lineStyle = useAnimatedStyle(() => ({
    opacity: lineOpacity.value,
    transform: [{ scale: lineScale.value }],
  }));

  if (!isActive) {
    return (
      <Reanimated.View style={[{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }, lineStyle]}>
        <Text style={{
          fontSize,
          lineHeight: lineHeight * 1.1,
          fontWeight: '700',
          color: isPast ? '#fff' : 'rgba(255,255,255,0.22)',
          letterSpacing: 0.2,
        }}>
          {text}
        </Text>
      </Reanimated.View>
    );
  }

  // Split the lyric text line into an array of individual words.
  const words = useMemo(() => text.split(' '), [text]);

  // Dynamically calculate the spacing (marginRight) between words based on current fontSize.
  const marginRight = fontSize * 0.28;

  // Calculate the total duration of this lyric line in seconds (endTime minus startTime).
  // We use Math.max to enforce a minimum fallback of 0.5s if timestamps are missing or too close.
  const totalDuration = Math.max(endTime - startTime, 0.5);

  // Distribute the duration across words so normal singing fills the full line duration without rushing.
  // Cap at 0.6s per word only to prevent stretching words excessively during long instrumental pauses between lines.
  const effectiveDuration = Math.min(totalDuration, words.length * 0.6);
  const wordDuration = effectiveDuration / Math.max(words.length, 1);

  // Map each word to its specific start time (cue) sequentially.
  // The first word starts at startTime, and subsequent words start increments of wordDuration later.
  const cueTimes = useMemo(
    () => words.map((_, i) => startTime + i * wordDuration),
    [words, startTime, wordDuration]
  );


  // Determine the word fade-in transition duration.
  const transition = Math.min(wordDuration, 0.35);

  return (
    <Reanimated.View style={[{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }, lineStyle]}>
      {words.map((word, i) => (
        <AnimatedWord
          key={i}
          word={word}
          cue={cueTimes[i]}
          transition={transition}
          isActive={isActive}
          smoothPosition={smoothPosition}
          fontSize={fontSize}
          lineHeight={lineHeight}
          marginRight={marginRight}
        />
      ))}
    </Reanimated.View>
  );
});

export default LyricLine;
