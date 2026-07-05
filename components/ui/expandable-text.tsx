import React, { useState } from 'react';
import { StyleSheet, View, StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Typography } from './typography';
import { Button } from './button';
import { BunnyCard } from './bunny-card';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';

export interface ExpandableTextProps {
  text: string;
  limit?: number; // character limit before showing read more button (default 200)
  numberOfLines?: number; // truncated line limit (default 5)
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  
  // Card layout options
  asCard?: boolean; // wrap in a BunnyCard (default false)
  title?: string; // card header title (default 'Biography')
  badge?: string; // e.g. '123,456 views' or other top right pill badges
}

export function ExpandableText({
  text,
  limit = 200,
  numberOfLines = 5,
  style,
  containerStyle,
  asCard = false,
  title = 'Biography',
  badge,
}: ExpandableTextProps) {
  const { colors } = useAppTheme();
  const [expanded, setExpanded] = useState(false);

  const cleanText = typeof text === 'string' ? text : '';
  const hasMore = cleanText.length > limit;

  const content = (
    <View style={containerStyle}>
      {asCard && (title || badge) && (
        <View style={styles.header}>
          {title && <Typography style={[styles.title, { color: colors.text }]}>{title}</Typography>}
          {badge && (
            <View style={[styles.viewsPill, { backgroundColor: addAlpha(colors.primary, 0.09) }]}>
              <Typography style={[styles.viewsPillText, { color: colors.primary }]}>{badge}</Typography>
            </View>
          )}
        </View>
      )}
      <Typography
        numberOfLines={expanded ? undefined : numberOfLines}
        style={[styles.text, { color: colors.text }, style]}
      >
        {cleanText}
      </Typography>
      {hasMore && (
        <Button
          variant="link"
          size="sm"
          onPress={() => setExpanded(!expanded)}
          style={styles.moreBtn}
          label={expanded ? 'Show Less' : 'Read More'}
        />
      )}
    </View>
  );

  if (asCard) {
    return (
      <BunnyCard style={styles.card} glass={true} elevated={true}>
        {content}
      </BunnyCard>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
  },
  moreBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  viewsPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewsPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
