import React from 'react';
import { View } from 'react-native';
import Reanimated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Typography as Text } from '@/components/ui/typography';

interface AnimatedWordProps {
  word: string;
  cue: number;
  transition: number;
  isActive: boolean;
  smoothPosition: SharedValue<number>;
  fontSize: number;
  lineHeight: number;
  marginRight: number;
}

const AnimatedWord = React.memo(({
  word,
  cue,
  transition,
  smoothPosition,
  fontSize,
  lineHeight,
  marginRight,
}: AnimatedWordProps) => {
  const animStyle = useAnimatedStyle(() => {
    const t = smoothPosition.value ;
    let p = 0;
    if (t >= cue + transition) p = 1;
    else if (t > cue) p = (t - cue) / transition;
    return { opacity: p };
  }, [cue, transition]);

  return (
    <View style={{ position: 'relative', marginRight }}>
      <Text style={{ fontSize, lineHeight: lineHeight * 1.1, fontWeight: '700', color: 'rgba(255,255,255,0.22)', letterSpacing: 0.2 }}>
        {word}
      </Text>
      <Reanimated.View style={[{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 }, animStyle]}>
        <Text style={{ fontSize, lineHeight: lineHeight * 1.1, fontWeight: '700', color: '#fff', letterSpacing: 0.2 }}>
          {word}
        </Text>
      </Reanimated.View>
    </View>
  );
});

export default AnimatedWord;
