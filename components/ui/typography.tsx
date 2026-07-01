import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useThemeColor } from '@/hooks/use-theme-color';

interface BaseTextProps extends TextProps {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'lead' | 'large' | 'small' | 'muted';
  className?: string;
}

// Helper to resolve custom font family and strip weight to avoid React Native fallbacks
export function resolveFontStyles(
  flatStyle: any,
  activeFont: string,
  fontFamilies: { body: string; heading: string; semiBold: string }
) {
  if (!flatStyle) return flatStyle;
  if (activeFont !== 'poppins' && activeFont !== 'nunito' && activeFont !== 'combo') {
    return flatStyle;
  }

  const weight = flatStyle.fontWeight;
  let resolvedFontFamily = flatStyle.fontFamily || fontFamilies.body;

  if (weight) {
    const weightStr = String(weight);
    if (weightStr === 'bold' || weightStr === '700' || weightStr === '800' || weightStr === '900') {
      resolvedFontFamily = fontFamilies.heading;
    } else if (weightStr === '500' || weightStr === '600') {
      resolvedFontFamily = fontFamilies.semiBold;
    } else {
      resolvedFontFamily = fontFamilies.body;
    }
  } else {
    // If no weight is specified, check if the current fontFamily is one of our custom fonts,
    // otherwise fallback to the active font's body font.
    const knownFonts = [
      fontFamilies.body,
      fontFamilies.semiBold,
      fontFamilies.heading,
    ];
    if (!flatStyle.fontFamily || !knownFonts.includes(flatStyle.fontFamily)) {
      resolvedFontFamily = fontFamilies.body;
    }
  }

  // Create a copy of the styles, set the resolved fontFamily, and delete fontWeight
  const newStyle = { ...flatStyle, fontFamily: resolvedFontFamily };
  delete newStyle.fontWeight;
  return newStyle;
}

export function Typography({ variant = 'p', style, className, ...props }: BaseTextProps) {
  const { font, fontFamily, headingFontFamily, semiBoldFontFamily } = useAppTheme();
  const textColor = useThemeColor({}, variant === 'muted' ? 'mutedForeground' : 'text');

  const getVariantStyle = () => {
    switch (variant) {
      case 'h1':
        return {
          fontSize: 30,
          lineHeight: 36,
          fontFamily: headingFontFamily,
          fontWeight: '700' as const,
        };
      case 'h2':
        return {
          fontSize: 24,
          lineHeight: 32,
          fontFamily: headingFontFamily,
          fontWeight: '600' as const,
        };
      case 'h3':
        return {
          fontSize: 20,
          lineHeight: 28,
          fontFamily: headingFontFamily,
          fontWeight: '600' as const,
        };
      case 'h4':
        return {
          fontSize: 18,
          lineHeight: 28,
          fontFamily: headingFontFamily,
          fontWeight: '600' as const,
        };
      case 'p':
        return {
          fontSize: 16,
          lineHeight: 24,
          fontFamily: fontFamily,
        };
      case 'lead':
        return {
          fontSize: 20,
          lineHeight: 28,
          fontFamily: fontFamily,
        };
      case 'large':
        return {
          fontSize: 18,
          lineHeight: 28,
          fontFamily: semiBoldFontFamily,
          fontWeight: '600' as const,
        };
      case 'small':
        return {
          fontSize: 14,
          lineHeight: 20,
          fontFamily: semiBoldFontFamily,
          fontWeight: '500' as const,
        };
      case 'muted':
        return {
          fontSize: 14,
          lineHeight: 20,
          fontFamily: fontFamily,
        };
      default:
        return {};
    }
  };

  const mergedStyle = StyleSheet.flatten([
    getVariantStyle(),
    { color: textColor },
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
      {...props}
    />
  );
}

export const H1 = (props: TextProps) => <Typography variant="h1" {...props} />;
export const H2 = (props: TextProps) => <Typography variant="h2" {...props} />;
export const H3 = (props: TextProps) => <Typography variant="h3" {...props} />;
export const H4 = (props: TextProps) => <Typography variant="h4" {...props} />;
export const P = (props: TextProps) => <Typography variant="p" {...props} />;
export const Lead = (props: TextProps) => <Typography variant="lead" {...props} />;
export const Large = (props: TextProps) => <Typography variant="large" {...props} />;
export const Small = (props: TextProps) => <Typography variant="small" {...props} />;
export const Muted = (props: TextProps) => <Typography variant="muted" {...props} />;
export const Label = (props: TextProps) => (
  <Typography
    variant="small"
    style={{ fontWeight: '600', marginBottom: 4 }}
    {...props}
  />
);
