/**
 * MarqueeText
 * Renders text that auto-scrolls horizontally when it overflows its container.
 * Stays still when the text fits. Pauses briefly at each end before reversing.
 */
import { useEffect, useRef, useState, useMemo } from 'react';
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

  // Split layout properties onto the outer View and styling onto the inner Text
  const outerStyle: any[] = [{ overflow: 'hidden' }];
  const textStyle: any[] = [];

  if (style) {
    const flat = StyleSheet.flatten(style);
    const layoutProps = [
      'flex', 'flexGrow', 'flexShrink', 'flexBasis',
      'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
      'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
      'position', 'top', 'bottom', 'left', 'right', 'alignSelf',
    ];
    
    const outer: any = {};
    const text: any = {};
    
    for (const key of Object.keys(flat)) {
      if (layoutProps.includes(key)) {
        outer[key] = (flat as any)[key];
      } else {
        text[key] = (flat as any)[key];
      }
    }
    outerStyle.push(outer);
    textStyle.push(text);
  }

  // If no horizontal flex or width is specified, default to width: '100%' so it fills its container widthwise
  const hasWidthLayout = outerStyle.some(
    (s) => s.width !== undefined || s.flex !== undefined || s.flexGrow !== undefined
  );
  if (!hasWidthLayout) {
    outerStyle.push({ width: '100%' });
  }

  const resolvedTextStyle = useMemo(() => {
    return resolveFontStyles(StyleSheet.flatten(textStyle), font, {
      body: fontFamily,
      heading: headingFontFamily,
      semiBold: semiBoldFontFamily,
    });
  }, [textStyle, font, fontFamily, headingFontFamily, semiBoldFontFamily]);

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
      style={outerStyle}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {/* Hidden text component to measure full untruncated width */}
      <Text
        style={[
          resolvedTextStyle,
          {
            position: 'absolute',
            opacity: 0,
            left: -9999,
            top: -9999,
          }
        ]}
        numberOfLines={1}
        ellipsizeMode="clip"
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          if (w > 0 && w !== textWidth) {
            setTextWidth(w);
          }
        }}
      >
        {children}
      </Text>

      <Animated.View style={{ transform: [{ translateX }], width: textWidth ? textWidth + 10 : undefined }}>
        <Text
          style={resolvedTextStyle}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {children}
        </Text>
      </Animated.View>
    </View>
  );
}
