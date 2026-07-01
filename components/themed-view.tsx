import { View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  surface?: 'background' | 'card' | 'popover';
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  surface = 'background',
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, surface);

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
