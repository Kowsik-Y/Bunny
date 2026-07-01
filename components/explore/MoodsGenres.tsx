import React from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { H2 } from '@/components/ui/typography';
import { CategoryCard } from '@/components/cards';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { IconSymbolName } from '@/components/ui/icon-symbol';

interface CategoryItem {
  id: string;
  title: string;
  color: string;
  icon: IconSymbolName;
}

interface MoodsGenresProps {
  categories: CategoryItem[];
  onCategoryPress: (category: CategoryItem) => void;
}

export function MoodsGenres({ categories, onCategoryPress }: MoodsGenresProps) {
  const renderCategory = ({ item, index }: { item: CategoryItem; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50)}
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
        <H2 style={styles.sectionTitle}>Moods & Genres</H2>
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
    letterSpacing: -0.5,
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
