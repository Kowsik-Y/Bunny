import React, { useState } from 'react';
import { View, Image, StyleSheet, ViewProps, ImageProps } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from './typography';

interface AvatarProps extends ViewProps {
  src?: string;
  fallback?: string;
  size?: number;
}

export function Avatar({ src, fallback, size = 40, style, ...props }: AvatarProps) {
  const { colors, semiBoldFontFamily } = useAppTheme();
  const [hasError, setHasError] = useState(false);

  const borderRadius = size / 2;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: colors.muted,
        },
        style,
      ]}
      {...props}
    >
      {src && !hasError ? (
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size, borderRadius }}
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={[styles.fallback, { borderRadius }]}>
          <Typography
            style={{
              fontSize: size * 0.4,
              fontFamily: semiBoldFontFamily,
              color: colors.mutedForeground,
              fontWeight: '600',
            }}
          >
            {fallback?.substring(0, 2).toUpperCase() || '??'}
          </Typography>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
