import React from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';

interface RecentSearchesProps {
  searches: string[];
  onSearch: (query: string) => void;
  onClearAll: () => void;
}

export function RecentSearches({ searches, onSearch, onClearAll }: RecentSearchesProps) {
  const { colors } = useAppTheme();
  if (searches.length === 0) return null;

  return (
    <View style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <Typography variant="small" style={styles.historyLabel}>RECENT SEARCHES</Typography>
        <TouchableOpacity onPress={onClearAll} hitSlop={8}>
          <Typography variant="small" style={{ color: colors.primary, fontWeight: '600', fontSize: 11 }}>Clear All</Typography>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentScroll}>
        {searches.map((item, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => onSearch(item)}
            style={[
              styles.recentTag,
              { borderColor: colors.border, backgroundColor: colors.card }
            ]}
          >
            <Typography style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>{item}</Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  historyContainer: {
    marginBottom: 32,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyLabel: {
    fontSize: 11,
    letterSpacing: 1,
    opacity: 0.6,
  },
  recentScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  recentTag: {
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
