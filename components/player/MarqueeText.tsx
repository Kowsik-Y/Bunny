/**
 * MarqueeText
 * Renders text that auto-scrolls horizontally when it overflows its container.
 * Stays still when the text fits. Pauses briefly at each end before reversing.
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type TextStyle, type StyleProp } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { resolveFontStyles } from '@/components/ui/typography';

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  /** pixels/second scroll speed, default 40 */
  speed?: number;
  /** ms pause at each end before reversing, default 1500 */
  pauseMs?: number;
};

export default function MarqueeText({ children, style, speed = 40, pauseMs = 1500 }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  const { font, fontFamily, headingFontFamily, semiBoldFontFamily } = useAppTheme();
  const resolvedStyle = useMemo(() => {
    const flat = StyleSheet.flatten(style);
    return resolveFontStyles(flat, font, {
      body: fontFamily,
      heading: headingFontFamily,
      semiBold: semiBoldFontFamily,
    });
  }, [style, font, fontFamily, headingFontFamily, semiBoldFontFamily]);

  const overflow = textWidth > containerWidth;
  const distance = overflow ? textWidth - containerWidth + 8 : 0; // 8px extra gap

  useEffect(() => {
    if (!overflow || distance <= 0) {
      translateX.setValue(0);
      return;
    }

    const duration = (distance / speed) * 1000;

    const slide = () => {
      animRef.current = Animated.sequence([
        Animated.delay(pauseMs),
        Animated.timing(translateX, {
          toValue: -distance,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.delay(pauseMs),
        Animated.timing(translateX, {
          toValue: 0,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start(({ finished }) => {
        if (finished) slide();
      });
    };

    slide();
    return () => {
      animRef.current?.stop();
      translateX.setValue(0);
    };
  }, [distance, overflow, speed, pauseMs]);

  return (
    <View
      style={styles.clip}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={{ transform: [{ translateX }] }}>
        <Text
          style={resolvedStyle}
          numberOfLines={1}
          onLayout={(e) => setTextWidth(e.nativeEvent.layout.width)}
        >
          {children}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    flexShrink: 1,
  },
});
