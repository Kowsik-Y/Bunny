import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Typography, Muted } from '@/components/ui/typography';
import { ThumbsUp, List } from 'lucide-react-native';
import { useAppTheme } from '@/contexts/app-theme-context';

interface EmptyStateProps {
  tab: 'queue' | 'saved';
}

export function EmptyState({ tab }: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.emptyState}>
      {tab === 'queue' ? (
        <List size={48} color={colors.mutedForeground} />
      ) : (
        <ThumbsUp size={48} color={colors.mutedForeground} />
      )}
      <Typography variant='large' style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
        {tab === 'queue' ? 'Queue is empty' : 'No saved tracks yet'}
      </Typography>
      <Muted style={{ textAlign: 'center' }}>
        {tab === 'queue'
          ? 'Search for music in Explore to add songs to your queue'
          : 'Thumbs-up songs to save them here'}
      </Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
});
