import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';
import { Typography } from './typography';

export type AlertVariant = 'default' | 'destructive';

interface AlertProps extends ViewProps {
  variant?: AlertVariant;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function Alert({
  variant = 'default',
  title,
  description,
  icon,
  style,
  ...props
}: AlertProps) {
  const { colors, semiBoldFontFamily } = useAppTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          container: { borderColor: colors.destructive, backgroundColor: addAlpha(colors.destructive, 0.08) },
          title: { color: colors.destructive },
          description: { color: colors.destructive },
        };
      default:
        return {
          container: { borderColor: colors.border, backgroundColor: colors.card },
          title: { color: colors.text },
          description: { color: colors.text },
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <View
      style={[
        styles.container,
        variantStyles.container,
        style,
      ]}
      {...props}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.content}>
        {title && (
          <Typography
            style={[
              styles.title,
              variantStyles.title,
              { fontFamily: semiBoldFontFamily, fontWeight: '600' },
            ]}
          >
            {title}
          </Typography>
        )}
        {description && (
          <Typography
            variant="small"
            style={[styles.description, variantStyles.description]}
          >
            {description}
          </Typography>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    opacity: 0.9,
  },
});
