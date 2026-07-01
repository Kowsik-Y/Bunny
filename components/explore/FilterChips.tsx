import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';

interface FilterChipsProps {
  activeFilter: 'all' | 'songs' | 'artists' | 'albums';
  onFilterChange: (filter: 'all' | 'songs' | 'artists' | 'albums') => void;
}

export function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  const { colors } = useAppTheme();
  
  const filters = [
    { id: 'all', title: 'All' },
    { id: 'songs', title: 'Songs' },
    { id: 'artists', title: 'Artists' },
    { id: 'albums', title: 'Albums' },
  ] as const;

  return (
    <View style={styles.filterChipsRow}>
      {filters.map((f) => {
        const isActive = activeFilter === f.id;
        return (
          <TouchableOpacity
            key={f.id}
            onPress={() => onFilterChange(f.id)}
            style={[
              styles.presetChip,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
              isActive && {
                backgroundColor: addAlpha(colors.primary, 0.15),
                borderColor: colors.primary,
              }
            ]}
          >
            <Typography
              style={[
                { color: colors.text, fontSize: 13, fontWeight: '600' },
                isActive && { color: colors.primary }
              ]}
            >
              {f.title}
            </Typography>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  filterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 14,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
});
