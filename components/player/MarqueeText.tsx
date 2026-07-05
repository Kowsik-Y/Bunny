import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useFrameCallback,
  type SharedValue,
} from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/app-theme-context';
import { resolveFontStyles } from '@/components/ui/typography';

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  speed?: number; // px/sec
};

const GAP = 40;
const START_DELAY = 1500;

const marqueeStyles = StyleSheet.create({
  hidden: { opacity: 0 },
  row: { flexDirection: 'row', overflow: 'hidden' },
});

function MeasureElement({
  onLayout,
  children,
}: {
  onLayout: (width: number) => void;
  children: ReactNode;
}) {
  return (
    <Animated.ScrollView
      horizontal
      style={marqueeStyles.hidden}
      pointerEvents="none"
      scrollEnabled={false}
    >
      <View onLayout={(ev) => onLayout(Math.ceil(ev.nativeEvent.layout.width))}>
        {children}
      </View>
    </Animated.ScrollView>
  );
}

function TranslatedElement({
  index,
  offset,
  step,
  children,
}: {
  index: number;
  offset: SharedValue<number>;
  step: number;
  children: ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    transform: [{ translateX: index * step - offset.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function ChildrenScroller({
  duration,
  childrenWidth,
  parentWidth,
  gap,
  active,
  children,
}: {
  duration: number;
  childrenWidth: number;
  parentWidth: number;
  gap: number;
  active: SharedValue<boolean>;
  children: ReactNode;
}) {
  const offset = useSharedValue(0);
  const step = childrenWidth + gap;

  useFrameCallback((frame) => {
    'worklet';
    if (!active.value || step <= 0 || duration <= 0) return;
    const dt = frame.timeSincePreviousFrame ?? 16.67;
    offset.value += (dt * step) / duration;
    offset.value = offset.value % step;
  }, true);

  const count = Math.ceil(parentWidth / step) + 2;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <TranslatedElement key={index} index={index} offset={offset} step={step}>
          {children}
        </TranslatedElement>
      ))}
    </>
  );
}

export default function MarqueeText({ children, style, speed = 40 }: Props) {
  const [parentWidth, setParentWidth] = useState(0);
  const [childrenWidth, setChildrenWidth] = useState(0);
  const active = useSharedValue(false);

  const { font, fontFamily, headingFontFamily, semiBoldFontFamily } = useAppTheme();

  const outerStyle: any[] = [{}];
  const innerStyle: any[] = [];

  if (style) {
    const flat = StyleSheet.flatten(style);
    const layoutProps = [
      'flex', 'flexGrow', 'flexShrink', 'flexBasis',
      'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
      'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
      'marginHorizontal', 'marginVertical',
      'position', 'top', 'bottom', 'left', 'right', 'alignSelf',
    ];
    const outer: any = {};
    const text: any = {};
    Object.keys(flat).forEach((key) => {
      if (layoutProps.includes(key)) outer[key] = (flat as any)[key];
      else text[key] = (flat as any)[key];
    });
    outerStyle.push(outer);
    innerStyle.push(text);
  }

  if (
    !outerStyle.some(
      (s) => s.width !== undefined || s.flex !== undefined || s.flexGrow !== undefined
    )
  ) {
    outerStyle.push({ width: '100%' });
  }

  const textStyleKey = useMemo(
    () => JSON.stringify(innerStyle),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(innerStyle)]
  );

  const resolvedStyle = useMemo(() => {
    const base = resolveFontStyles(StyleSheet.flatten(innerStyle), font, {
      body: fontFamily,
      heading: headingFontFamily,
      semiBold: semiBoldFontFamily,
    });
    return [base, { textAlign: 'left' as const }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [font, fontFamily, headingFontFamily, semiBoldFontFamily, textStyleKey]);

  // Key that changes whenever the text/style actually changes -- used to
  // force-remount the measuring + scrolling subtree below. This guarantees
  // a fresh onLayout measurement every time, even if the new text happens
  // to render at the exact same pixel width as the old one (onLayout does
  // NOT fire again in that case on a component that stays mounted).
  const contentKey = `${children}::${textStyleKey}`;

  useEffect(() => {
    setChildrenWidth(0);
    setParentWidth((w) => w); // parent width doesn't need reset
    active.value = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  const overflow =
    parentWidth > 0 && childrenWidth > 0 && childrenWidth > parentWidth;

  useEffect(() => {
    if (!overflow) {
      active.value = false;
      return;
    }
    const timer = setTimeout(() => {
      active.value = true;
    }, START_DELAY);
    return () => {
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overflow, contentKey]);

  const duration = childrenWidth > 0 ? (childrenWidth / speed) * 1000 : 0;

  return (
    <View
      style={outerStyle}
      onLayout={(e) => setParentWidth(Math.ceil(e.nativeEvent.layout.width))}
      pointerEvents="box-none"
    >
      {/* key={contentKey} forces this whole subtree to fully unmount and
          remount whenever the song/text changes, so measurement and the
          scroller always start clean instead of possibly reusing a stale
          layout/width from the previous song. */}
      <View style={marqueeStyles.row} pointerEvents="box-none" key={contentKey}>
        <MeasureElement onLayout={setChildrenWidth}>
          <Text numberOfLines={1} style={resolvedStyle}>
            {children}
          </Text>
        </MeasureElement>

        {!overflow ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[resolvedStyle, { position: 'absolute', left: 0, top: 0 }]}
          >
            {children}
          </Text>
        ) : (
          childrenWidth > 0 &&
          parentWidth > 0 && (
            <ChildrenScroller
              duration={duration}
              childrenWidth={childrenWidth}
              parentWidth={parentWidth}
              gap={GAP}
              active={active}
            >
              <Text numberOfLines={1} style={resolvedStyle}>
                {children}
              </Text>
            </ChildrenScroller>
          )
        )}
      </View>
    </View>
  );
}