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
  isExplicit?: boolean;
  explicitBadgeStyle?: StyleProp<TextStyle>;
};

const GAP = 40;
const START_DELAY = 1500; // pause duration, applied at the start AND after every loop

const marqueeStyles = StyleSheet.create({
  hidden: { opacity: 0 },
  row: { flexDirection: 'row', overflow: 'hidden' },
});

function MeasureElement({
  onLayout,
  children,
}: {
  onLayout: (width: number, height: number) => void;
  children: ReactNode;
}) {
  return (
    <Animated.ScrollView
      horizontal
      style={marqueeStyles.hidden}
      pointerEvents="none"
      scrollEnabled={false}
    >
      <View
        onLayout={(ev) =>
          onLayout(
            Math.ceil(ev.nativeEvent.layout.width),
            Math.ceil(ev.nativeEvent.layout.height)
          )
        }
      >
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
  holdMs,
  children,
}: {
  duration: number;
  childrenWidth: number;
  parentWidth: number;
  gap: number;
  active: SharedValue<boolean>;
  holdMs: number;
  children: ReactNode;
}) {
  const offset = useSharedValue(0);
  // Starts pre-loaded with a hold so we pause before the very first scroll.
  const holdRemaining = useSharedValue(holdMs);
  const step = childrenWidth + gap;

  useFrameCallback((frame) => {
    'worklet';
    if (!active.value || step <= 0 || duration <= 0) return;

    const dt = frame.timeSincePreviousFrame ?? 16.67;

    // While holding, just count down and don't move -- this is what
    // creates the "stop a second at starting" pause, both on first
    // mount and every time the loop returns to offset 0.
    if (holdRemaining.value > 0) {
      holdRemaining.value -= dt;
      return;
    }

    offset.value += (dt * step) / duration;

    if (offset.value >= step) {
      offset.value = offset.value % step;
      // Back at the start of a fresh cycle -- pause again before
      // continuing to scroll.
      holdRemaining.value = holdMs;
    }
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

export default function MarqueeText({
  children,
  style,
  speed = 40,
  isExplicit,
  explicitBadgeStyle,
}: Props) {
  const [parentWidth, setParentWidth] = useState(0);
  const [childrenWidth, setChildrenWidth] = useState(0);
  const [childrenHeight, setChildrenHeight] = useState(0);
  const active = useSharedValue(false);

  const { colors, font, fontFamily, headingFontFamily, semiBoldFontFamily } = useAppTheme();

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

  const contentKey = `${children}::${isExplicit}::${textStyleKey}`;

  useEffect(() => {
    setChildrenWidth(0);
    setChildrenHeight(0);
    active.value = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey]);

  const overflow =
    parentWidth > 0 && childrenWidth > 0 && childrenWidth > parentWidth;

  // Activate as soon as we know it should scroll -- the initial pause is
  // now handled inside the frame callback (holdRemaining), so there's no
  // need for a JS-side setTimeout delay here anymore.
  useEffect(() => {
    active.value = overflow;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overflow, contentKey]);

  const duration = childrenWidth > 0 ? (childrenWidth / speed) * 1000 : 0;

  const handleMeasure = (width: number, height: number) => {
    setChildrenWidth(width);
    setChildrenHeight((prev) => (height > prev ? height : prev));
  };

  const renderContent = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text numberOfLines={1} style={resolvedStyle}>
        {children}
      </Text>
      {isExplicit && (
        <View style={{
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: 6,
        }}>
          <Text style={[
            {
              backgroundColor: colors.mutedForeground,
              color: colors.background,
              fontSize: 9,
              fontWeight: '800',
              lineHeight: 11,
              paddingHorizontal: 4,
              paddingVertical: 1,
              borderRadius: 3,
              overflow: 'hidden',
            },
            explicitBadgeStyle,
          ]}>
            E
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View
      style={outerStyle}
      onLayout={(e) => setParentWidth(Math.ceil(e.nativeEvent.layout.width))}
      pointerEvents="box-none"
    >
      <View
        style={[
          marqueeStyles.row,
          {
            width: parentWidth || '100%',
            height: childrenHeight || undefined,
          },
        ]}
        pointerEvents="box-none"
        key={contentKey}
      >
        <MeasureElement onLayout={handleMeasure}>
          {renderContent()}
        </MeasureElement>

        {!overflow ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', position: 'absolute', left: 0, top: 0 }}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                resolvedStyle,
                { flexShrink: 1 },
              ]}
            >
              {children}
            </Text>
            {isExplicit && (
              <View style={{
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 6,
              }}>
                <Text style={[
                  {
                    backgroundColor: colors.mutedForeground,
                    color: colors.background,
                    fontSize: 9,
                    fontWeight: '800',
                    lineHeight: 11,
                    paddingHorizontal: 4,
                    paddingVertical: 1,
                    borderRadius: 3,
                    overflow: 'hidden',
                  },
                  explicitBadgeStyle,
                ]}>
                  E
                </Text>
              </View>
            )}
          </View>
        ) : (
          childrenWidth > 0 &&
          parentWidth > 0 && (
            <ChildrenScroller
              duration={duration}
              childrenWidth={childrenWidth}
              parentWidth={parentWidth}
              gap={GAP}
              active={active}
              holdMs={START_DELAY}
            >
              {renderContent()}
            </ChildrenScroller>
          )
        )}
      </View>
    </View>
  );
}