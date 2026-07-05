import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Typography } from '@/components/ui/typography';
import { CategoryCard } from '@/components/cards';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@/contexts/app-theme-context';

interface CategoryItem {
  id: string;
  title: string;
  color: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

interface MoodsGenresProps {
  categories: CategoryItem[];
  onCategoryPress: (category: CategoryItem) => void;
}

export function MoodsGenres({ categories, onCategoryPress }: MoodsGenresProps) {
  const { colors } = useAppTheme();

  const renderCategory = ({ item, index }: { item: CategoryItem; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(300)}
      style={styles.categoryCardContainer}
    >
      <CategoryCard
        title={item.title}
        color={item.color}
        icon={item.icon}
        onPress={() => onCategoryPress(item)}
      />
    </Animated.View>
  );

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Typography style={[styles.sectionTitle, { color: colors.text }]}>
          Moods & Genres
        </Typography>
      </View>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        numColumns={2}
        scrollEnabled={false}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.gridContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  gridContent: {
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryCardContainer: {
    width: '48%',
  },
});
