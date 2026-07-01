import React, { useEffect } from 'react';
import Svg, { Path, G, Rect, Circle } from 'react-native-svg';
import Animated, { 
  useAnimatedProps, 
  useSharedValue, 
  withSpring, 
  withRepeat, 
  withSequence, 
  withTiming,
  interpolate
} from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/app-theme-context';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

interface BunnyIconProps {
  size?: number;
  color: string;
  active?: boolean;
}

export const HomeBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const earTwitch = useSharedValue(0);

  useEffect(() => {
    if (active) {
      earTwitch.value = withSpring(1, { damping: 10, stiffness: 100 });
    } else {
      earTwitch.value = withSpring(0);
    }
  }, [active]);

  const earStyle = useAnimatedProps(() => {
    return {
      transform: [
        { translateY: interpolate(earTwitch.value, [0, 1], [0, -2]) },
        { scaleY: interpolate(earTwitch.value, [0, 1], [1, 1.1]) }
      ]
    };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Bunny Ears */}
      <AnimatedG animatedProps={earStyle}>
        <Path 
          d="M7 6C7 4 8 2 9 2C10 2 11 4 11 6V8H7V6Z" 
          fill={color} 
        />
        <Path 
          d="M13 6C13 4 14 2 15 2C16 2 17 4 17 6V8H13V6Z" 
          fill={color} 
        />
      </AnimatedG>
      {/* House Body */}
      <Path 
        d="M3 12L12 4L21 12V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V12Z" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <Path 
        d="M9 22V12H15V22" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </Svg>
  );
};

export const ExploreBunny = ({ size = 24, color }: BunnyIconProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Magnifying Glass Circle */}
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
      {/* Bunny Ears on lens (Static) */}
      <G origin="11, 11">
         <Path d="M9 4C9 2 9.5 1 10 1C10.5 1 11 2 11 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
         <Path d="M11 4C11 2 11.5 1 12 1C12.5 1 13 2 13 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </G>
      {/* Handle as Tail */}
      <Path d="M21 21L16.65 16.65" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="20" cy="20" r="2" fill={color} />
    </Svg>
  );
};

export const SettingsBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const earTwitch = useSharedValue(0);

  useEffect(() => {
    if (active) {
      earTwitch.value = withSpring(1, { damping: 10, stiffness: 100 });
    } else {
      earTwitch.value = withSpring(0);
    }
  }, [active]);

  const earStyle = useAnimatedProps(() => {
    return {
      transform: [
        { translateY: interpolate(earTwitch.value, [0, 1], [0, -1.2]) },
        { scaleY: interpolate(earTwitch.value, [0, 1], [1, 1.1]) }
      ]
    };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Gear teeth spokes */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <Path
          key={angle}
          d="M12 6.5V5"
          stroke={color}
          strokeWidth="2.2"
          strokeLinecap="round"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
      {/* Gear main body circles */}
      <Circle cx="12" cy="12" r="5.5" stroke={color} strokeWidth="2.2" fill={active ? color + '15' : 'none'} />
      <Circle cx="12" cy="12" r="2" stroke={color} strokeWidth="1.8" />
      
      {/* Dynamic top bunny ears */}
      <AnimatedG animatedProps={earStyle} origin="12, 6">
        <Path 
          d="M9.5 5.5c0-1.8.5-3 1-3s1 1.2 1 3" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round"
          fill={active ? color : 'none'}
        />
        <Path 
          d="M12.5 5.5c0-1.8.5-3 1-3s1 1.2 1 3" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round"
          fill={active ? color : 'none'}
        />
      </AnimatedG>
    </Svg>
  );
};

export const PlayBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (active) {
      tilt.value = withSpring(1, { damping: 10, stiffness: 100 });
    } else {
      tilt.value = withSpring(0);
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [{ rotate: `${interpolate(tilt.value, [0, 1], [0, 15])}deg` }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 12">
        {/* Play triangle shifted down slightly to give ears room */}
        <Path 
          d="M19 13L7 5V21L19 13Z" 
          fill={color} 
        />
        {/* Ears shifted down with the triangle */}
        <Path d="M7 5C7 3 8 1 9.5 1C11 1 12 3 12 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M10 5C10 3 11 1 12.5 1C14 1 15 3 15 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

export const PauseBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const twitch = useSharedValue(0);

  useEffect(() => {
    if (active) {
      twitch.value = withSpring(1, { damping: 10, stiffness: 100 });
    } else {
      twitch.value = withSpring(0);
    }
  }, [active]);

  const earStyle = useAnimatedProps(() => ({
    transform: [{ scaleY: interpolate(twitch.value, [0, 1], [1, 1.1]) }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Two long vertical bunny ears as pause bars, shifted down slightly */}
      <AnimatedG animatedProps={earStyle} origin="12, 12">
        <Rect x="7" y="5" width="3.5" height="16" rx="1.75" fill={color} />
        <Rect x="13.5" y="5" width="3.5" height="16" rx="1.75" fill={color} />
        {/* Little tuft details */}
        <Path d="M8.75 5C8.75 3 7.75 2 8.75 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M15.25 5C15.25 3 14.25 2 15.25 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

export const HeartBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withSequence(
        withSpring(1.4),
        withSpring(1)
      );
    }
  }, [active]);

  const heartStyle = useAnimatedProps(() => {
    return {
      transform: [{ scale: scale.value }]
    };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={heartStyle} origin="12, 12">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={active ? color : 'none'} stroke={color} strokeWidth="2" />
        <Path d="M9 1C9 0 9.5 -1 10 -1C10.5 -1 11 0 11 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M13 1C13 0 13.5 -1 14 -1C14.5 -1 15 0 15 1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

export const RepeatBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (active) {
      rotation.value = withSpring(360, { damping: 15, stiffness: 100 });
    } else {
      rotation.value = withSpring(0);
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [{ rotate: `${rotation.value}deg` }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 12">
        <Path d="M17 1l4 4-4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M3 11V9a4 4 0 014-4h14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M7 23l-4-4 4-4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M21 13v2a4 4 0 01-4 4H3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </AnimatedG>
      <Path d="M11 5C11 3 11.5 2 12 2C12.5 2 13 3 13 5" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
};

export const ShuffleBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const offset = useSharedValue(0);

  useEffect(() => {
    if (active) {
      offset.value = withSpring(-2, { damping: 10, stiffness: 100 });
    } else {
      offset.value = withSpring(0);
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [{ translateY: offset.value }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle}>
        <Path d="M16 3h5v5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M4 20L21 3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M21 16v5h-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M15 15l6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M4 4l5 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </AnimatedG>
      <Path d="M18 3C18 1 18.5 0 19 0C19.5 0 20 1 20 3" stroke={color} strokeWidth="1.5" />
    </Svg>
  );
};

export const SkipForwardBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const jump = useSharedValue(0);

  useEffect(() => {
    if (active) {
      jump.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 150 })
      );
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: interpolate(jump.value, [0, 1], [0, 4]) },
      { scaleX: interpolate(jump.value, [0, 1], [1, 1.1]) }
    ]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 12">
        {/* The functional triangle as the bunny body, shifted down */}
        <Path d="M5 5L15 13L5 21V5Z" fill={color} />
        {/* Ears integrated onto the top vertex slope, shifted down */}
        <Path d="M10 9C10 6 11 4 12.5 4C14 4 15 6 15 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M13 9C13 6 14 4 15.5 4C17 4 18 6 18 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Fluffy tail on the back vertical edge */}
        <Circle cx="5" cy="13" r="2" fill={color} />
      </AnimatedG>
      {/* The "Stop" bar, shifted down to match */}
      <Rect x="18" y="5" width="2" height="16" rx="1" fill={color} />
    </Svg>
  );
};

export const SkipBackBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const jump = useSharedValue(0);

  useEffect(() => {
    if (active) {
      jump.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 150 })
      );
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [
      { translateX: interpolate(jump.value, [0, 1], [0, -4]) },
      { scaleX: interpolate(jump.value, [0, 1], [1, 1.1]) }
    ]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 12">
        {/* The functional triangle as the bunny body (mirrored), shifted down */}
        <Path d="M19 5L9 13L19 21V5Z" fill={color} />
        {/* Ears integrated onto the top vertex slope (mirrored), shifted down */}
        <Path d="M14 9C14 6 13 4 11.5 4C10 4 9 6 9 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M11 9C11 6 10 4 8.5 4C10 4 11 6 11 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Fluffy tail on the back vertical edge */}
        <Circle cx="19" cy="13" r="2" fill={color} />
      </AnimatedG>
      {/* The "Stop" bar, shifted down to match */}
      <Rect x="4" y="5" width="2" height="16" rx="1" fill={color} />
    </Svg>
  );
};

export const LyricsBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const twitch = useSharedValue(0);

  useEffect(() => {
    if (active) {
      twitch.value = withRepeat(withSequence(withTiming(1, { duration: 200 }), withTiming(0, { duration: 200 })), 2, true);
    }
  }, [active]);

  const earStyle = useAnimatedProps(() => ({
    transform: [{ rotate: `${interpolate(twitch.value, [0, 1], [0, -10])}deg` }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Rounded square body (Apple-ish) */}
      <Rect x="4" y="6" width="16" height="15" rx="3" fill={color} opacity={0.15} />
      <Rect x="4" y="6" width="16" height="15" rx="3" stroke={color} strokeWidth="1.5" />
      
      {/* Lines for text appearance */}
      <Path d="M7 10H17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M7 13.5H17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M7 17H13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />

      {/* Floppy bunny ears resting on top */}
      <AnimatedG animatedProps={earStyle} origin="12, 6">
        {/* Left ear flopped */}
        <Path d="M8 6C8 4 7 2 5.5 2C4 2 4.5 4 5.5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        {/* Right ear flopped */}
        <Path d="M16 6C16 4 17 2 18.5 2C20 2 19.5 4 18.5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

export const CastBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const bounce = useSharedValue(0);

  useEffect(() => {
    if (active) {
      bounce.value = withSpring(1, { damping: 10, stiffness: 100 });
    } else {
      bounce.value = withSpring(0);
    }
  }, [active]);

  const tailStyle = useAnimatedProps(() => ({
    transform: [{ scale: interpolate(bounce.value, [0, 1], [1, 1.3]) }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Screen/Cast body */}
      <Path d="M5 16.12V18.5H7.38C7.38 17.19 6.31 16.12 5 16.12ZM5 12.6V14.37C7.28 14.37 9.13 16.22 9.13 18.5H10.9C10.9 15.24 8.26 12.6 5 12.6ZM5 9.07V10.84C9.23 10.84 12.66 14.27 12.66 18.5H14.43C14.43 13.29 10.21 9.07 5 9.07ZM21 3H3C1.89 3 1 3.89 1 5V8H3V5H21V19H14V21H21C22.11 21 23 20.11 23 19V5C23 3.89 22.11 3 21 3Z" fill={color} />
      {/* Fluffy tail on the corner */}
      <AnimatedG animatedProps={tailStyle} origin="21, 19">
        <Circle cx="21" cy="19" r="2.5" fill={color} />
        {/* Tiny ears on the tail to make it a mini-bunny? No, let's keep it a simple fluffy tail to avoid clutter */}
      </AnimatedG>
    </Svg>
  );
};

export const ListBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const twitch = useSharedValue(0);

  useEffect(() => {
    if (active) {
      twitch.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 150 }));
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [{ translateX: interpolate(twitch.value, [0, 1], [0, 2]) }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle}>
        {/* Tiny bunny heads as bullets */}
        {[8, 13, 18].map((y, i) => (
          <React.Fragment key={i}>
            <Circle cx="5" cy={y} r="1.5" fill={color} />
            <Path d={`M${5-1} ${y-1.5}C${5-1} ${y-3} ${5-0.5} ${y-3.5} ${5} ${y-1.5}`} stroke={color} strokeWidth="0.8" />
            <Path d={`M${5+1} ${y-1.5}C${5+1} ${y-3} ${5+0.5} ${y-3.5} ${5} ${y-1.5}`} stroke={color} strokeWidth="0.8" />
            {/* List line */}
            <Rect x="9" y={y-0.75} width="12" height="1.5" rx="0.75" fill={color} />
          </React.Fragment>
        ))}
      </AnimatedG>
    </Svg>
  );
};

export const SearchBunny: React.FC<BunnyIconProps> = ({ size, color, active }) => {
  const { colors } = useAppTheme();
  const iconColor = color || (active ? colors.primary : colors.text);

  const animStyle = useAnimatedProps(() => {
    return {
      transform: [
        { scale: withSpring(active ? 1.1 : 1, { damping: 10, stiffness: 100 }) },
      ],
    };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 12">
        {/* Magnifying glass handle */}
        <Path
          d="M19 19L15.5 15.5"
          stroke={iconColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* The glass/head */}
        <Circle
          cx="11"
          cy="11"
          r="6"
          stroke={iconColor}
          strokeWidth="2.5"
        />
        {/* Ears on the glass */}
        {/* Left ear */}
        <Path
          d="M8 6C8 3 9 2 9.5 2C10.5 2 10.5 4 10.5 6"
          stroke={iconColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right ear */}
        <Path
          d="M12.5 6C12.5 3 13.5 2 14 2C15 2 15 4 15 6"
          stroke={iconColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </AnimatedG>
    </Svg>
  );
};
export const PaletteBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const tilt = useSharedValue(0);

  useEffect(() => {
    if (active) {
      tilt.value = withSpring(1, { damping: 10, stiffness: 100 });
    } else {
      tilt.value = withSpring(0);
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [{ rotate: `${interpolate(tilt.value, [0, 1], [0, 20])}deg` }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 12">
        <Path d="M12 2C6.49 2 2 6.49 2 12C2 17.51 6.49 22 12 22C13.38 22 14.5 20.88 14.5 19.5C14.5 18.86 14.24 18.27 13.82 17.84C13.4 17.41 13.14 16.82 13.14 16.18C13.14 14.8 14.26 13.68 15.64 13.68H17.5C19.98 13.68 22 11.66 22 9.18C22 5.21 17.51 2 12 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="7.5" cy="10.5" r="1.5" fill={color} />
        <Circle cx="10.5" cy="7.5" r="1.5" fill={color} />
        <Circle cx="14.5" cy="7.5" r="1.5" fill={color} />
        <Circle cx="17.5" cy="10.5" r="1.5" fill={color} />
        {/* Bunny ears on top of palette */}
        <Path d="M9 2C9 1 9.5 0 10 0C10.5 0 11 1 11 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M13 2C13 1 13.5 0 14 0C14.5 0 15 1 15 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

export const FontBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const twitch = useSharedValue(0);

  useEffect(() => {
    if (active) {
      twitch.value = withRepeat(withTiming(1, { duration: 150 }), 2, true);
    }
  }, [active]);

  const earStyle = useAnimatedProps(() => ({
    transform: [{ translateY: interpolate(twitch.value, [0, 1], [0, -2]) }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20L10.2 4.19C10.63 3.1 11.31 3 12 3C12.69 3 13.37 3.1 13.8 4.19L20 20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8 15H16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <AnimatedG animatedProps={earStyle}>
        <Path d="M9.5 3C9.5 1 10.5 0 11 0C11.5 0 12 1 12 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M12 3C12 1 12.5 0 13 0C13.5 0 14.5 1 14.5 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

export const MoonBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const sway = useSharedValue(0);

  useEffect(() => {
    if (active) {
      sway.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
    } else {
      sway.value = withTiming(0);
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [{ rotate: `${interpolate(sway.value, [0, 1], [-5, 5])}deg` }]
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 12">
        <Path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={active ? color : 'none'} fillOpacity={0.2} />
        {/* Ears on the moon's curve */}
        <Path d="M11 3C11 1 11.5 0 12 0C12.5 0 13 1 13 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M14 4C14 2 14.5 1 15 1C15.5 1 16 2 16 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

export const RadioBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const earTwitch = useSharedValue(0);

  useEffect(() => {
    if (active) {
      earTwitch.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        true
      );
    } else {
      earTwitch.value = withTiming(0);
    }
  }, [active]);

  const earProps = useAnimatedProps(() => ({
    transform: [
      { rotate: `${interpolate(earTwitch.value, [0, 1], [-5, 5])}deg` }
    ]
  }));

  const signalProps = useAnimatedProps(() => ({
    opacity: active ? withRepeat(withTiming(0.4, { duration: 600 }), -1, true) : 0
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Radio Body */}
      <Rect x="3" y="10" width="18" height="11" rx="3" stroke={color} strokeWidth="2.5" fill={active ? color : 'none'} fillOpacity={0.1} />
      {/* Speaker Grill */}
      <Circle cx="8" cy="15.5" r="3.5" stroke={color} strokeWidth="2" />
      <Circle cx="8" cy="15.5" r="1" fill={color} />
      {/* Dial/Display */}
      <Rect x="14" y="13" width="4" height="2.5" rx="1" stroke={color} strokeWidth="2" />
      <Circle cx="16" cy="18.5" r="2" stroke={color} strokeWidth="2" />
      
      {/* Bunny Ear Handles/Antenna */}
      <AnimatedG animatedProps={earProps} origin="12, 10">
        <Path d="M9 10C9 5 10 3 11 3C12 3 12.5 5 11.5 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <Path d="M15 10C15 5 14 3 13 3C12 3 11.5 5 12.5 10" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </AnimatedG>

      {/* Animated Signal Waves */}
      <AnimatedPath 
        d="M2 6C2 6 5 2 12 2C19 2 22 6 22 6" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        animatedProps={signalProps}
      />
    </Svg>
  );
};

export const PlusBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G origin="12, 12">
        <Path d="M12 5V19M5 12H19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {/* Tiny ears on the plus sign */}
        <Path d="M10 5C10 3 10.5 2 11 2C11.5 2 12 3 12 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M12 5C12 3 12.5 2 13 2C13.5 2 14 3 14 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </G>
    </Svg>
  );
};
export const XBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G origin="12, 12">
        <Path d="M5 5L19 19M19 5L5 19" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {/* Tiny ears on the plus sign */}
        <Path d="M10 5C10 3 10.5 2 11 2C11.5 2 12 3 12 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M12 5C12 3 12.5 2 13 2C13.5 2 14 3 14 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </G>
    </Svg>
  );
};

// ─── ChevronDownBunny ───────────────────────────────────────────────────────
export const ChevronDownBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const drop = useSharedValue(0);

  useEffect(() => {
    drop.value = active
      ? withSpring(1, { damping: 10, stiffness: 150 })
      : withSpring(0);
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [{ translateY: interpolate(drop.value, [0, 1], [0, 2]) }],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 14">
        <Path
          d="M5 9L12 16L19 9"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Tiny bunny ears riding atop the chevron peak */}
        <Path d="M10 9C10 7 10.5 6 11 6C11.5 6 12 7 12 9" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <Path d="M12 9C12 7 12.5 6 13 6C13.5 6 14 7 14 9" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

// ─── ChevronRightBunny ──────────────────────────────────────────────────────
export const ChevronRightBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const hop = useSharedValue(0);

  useEffect(() => {
    if (active) {
      hop.value = withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0, { duration: 120 })
      );
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [{ translateX: interpolate(hop.value, [0, 1], [0, 3]) }],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 12">
        <Path
          d="M9 5L16 12L9 19"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Tiny ear tufts on the arrow tip */}
        <Path d="M15 10C16 8 16.5 7 17 7C17.5 7 18 8 16.5 10" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <Path d="M15 14C16 16 16.5 17 17 17C17.5 17 18 16 16.5 14" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

// ─── CodeBunny ──────────────────────────────────────────────────────────────
export const CodeBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const flash = useSharedValue(1);

  useEffect(() => {
    if (active) {
      flash.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 300 }), withTiming(1, { duration: 300 })),
        2,
        false
      );
    }
  }, [active]);

  const animStyle = useAnimatedProps(() => ({ opacity: flash.value }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle}>
        <Path d="M16 18L22 12L16 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M8 6L2 12L8 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </AnimatedG>
      {/* Bunny ears on the right bracket peak */}
      <Path d="M20 5C20 3 20.5 2 21 2C21.5 2 22 3 22 5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      <Path d="M14 5C14 3 14.5 2 15 2C15.5 2 16 3 16 5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
    </Svg>
  );
};

// ─── ChevronUpBunny ─────────────────────────────────────────────────────────
export const ChevronUpBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const lift = useSharedValue(0);

  useEffect(() => {
    lift.value = active
      ? withSpring(1, { damping: 10, stiffness: 150 })
      : withSpring(0);
  }, [active]);

  const animStyle = useAnimatedProps(() => ({
    transform: [{ translateY: interpolate(lift.value, [0, 1], [0, -2]) }],
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedG animatedProps={animStyle} origin="12, 11">
        <Path
          d="M5 15L12 8L19 15"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Tiny bunny ears perched above the apex */}
        <Path d="M10 8C10 6 10.5 5 11 5C11.5 5 12 6 12 8" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        <Path d="M12 8C12 6 12.5 5 13 5C13.5 5 14 6 14 8" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

export const MusicNoteBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const earTwitch = useSharedValue(0);

  useEffect(() => {
    if (active) {
      earTwitch.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        true
      );
    } else {
      earTwitch.value = withTiming(0);
    }
  }, [active]);

  const earStyle = useAnimatedProps(() => {
    return {
      transform: [
        { translateY: interpolate(earTwitch.value, [0, 1], [0, -1.5]) }
      ]
    };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Note Head */}
      <Circle cx="8" cy="17" r="3" fill={color} />
      {/* Stem */}
      <Path d="M11 17V6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Flag/Beam */}
      <Path d="M11 6C13 6 16 7 16 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Tiny Bunny Ears on top of the stem */}
      <AnimatedG animatedProps={earStyle} origin="11, 6">
        <Path d="M9.5 6C9.5 4 10 3 10.5 3C11 3 11.5 4 11.5 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M11.5 6C11.5 4 12 3 12.5 3C13 3 13.5 4 13.5 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </AnimatedG>
    </Svg>
  );
};

export const ProfileBunny = ({ size = 24, color, active }: BunnyIconProps) => {
  const earTwitch = useSharedValue(0);

  useEffect(() => {
    if (active) {
      earTwitch.value = withSpring(1, { damping: 10, stiffness: 100 });
    } else {
      earTwitch.value = withSpring(0);
    }
  }, [active]);

  const earStyle = useAnimatedProps(() => {
    return {
      transform: [
        { translateY: interpolate(earTwitch.value, [0, 1], [0, -1.2]) },
        { scaleY: interpolate(earTwitch.value, [0, 1], [1, 1.1]) }
      ]
    };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G transform="scale(1.12) translate(-1.3, -0.8)">
        {/* Ears */}
        <AnimatedG animatedProps={earStyle} origin="12, 9">
          <Path 
            d="M9.5 8.5c0-1.8.5-3.5 1-3.5s1 1.7 1 3.5v1.5h-2v-1.5z" 
            stroke={color} 
            strokeWidth="2"
            fill={active ? color : 'none'}
          />
          <Path 
            d="M12.5 8.5c0-1.8.5-3.5 1-3.5s1 1.7 1 3.5v1.5h-2v-1.5z" 
            stroke={color} 
            strokeWidth="2"
            fill={active ? color : 'none'}
          />
        </AnimatedG>
        {/* User Head */}
        <Circle cx="12" cy="11.5" r="3.5" stroke={color} strokeWidth="2.2" fill={active ? color : 'none'} />
        {/* User Body/Shoulders */}
        <Path 
          d="M6 20c0-2.5 2.7-4.5 6-4.5s6 2 6 4.5" 
          stroke={color} 
          strokeWidth="2.2" 
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
};

