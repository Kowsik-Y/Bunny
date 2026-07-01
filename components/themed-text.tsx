import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { useAppTheme } from '@/contexts/app-theme-context';
import { resolveFontStyles } from '@/components/ui/typography';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({}, 'tint');
  const { font, fontFamily, headingFontFamily, semiBoldFontFamily } = useAppTheme();
  
  const baseFontFamily =
    type === 'title' || type === 'subtitle'
      ? headingFontFamily
      : type === 'defaultSemiBold'
      ? semiBoldFontFamily
      : fontFamily;

  const mergedStyle = StyleSheet.flatten([
    { fontFamily: baseFontFamily },
    { color },
    type === 'default' ? styles.default : undefined,
    type === 'title' ? styles.title : undefined,
    type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
    type === 'subtitle' ? styles.subtitle : undefined,
    type === 'link' ? [styles.link, { color: linkColor }] : undefined,
    style,
  ]);

  const resolvedStyle = resolveFontStyles(
    mergedStyle,
    font,
    { body: fontFamily, heading: headingFontFamily, semiBold: semiBoldFontFamily }
  );

  return (
    <Text
      style={resolvedStyle}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
