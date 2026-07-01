import React from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Typography } from '@/components/ui/typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ArtistActionButtonsProps {
  onShuffle: () => void;
  onMix: () => void;
}

export function ArtistActionButtons({ onShuffle, onMix }: ArtistActionButtonsProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.actionRow, { backgroundColor: colors.background }]}>
      <Pressable
        android_ripple={{
          color: colors.accent,
        }}
        onPress={onShuffle}
        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
      >
        <IconSymbol name="shuffle" size={17} color={colors.background} />
        <Typography style={[styles.actionBtnLabel, { color: colors.background }]}>Shuffle</Typography>
      </Pressable>

      <Pressable
        android_ripple={{
          color: colors.accent,
        }}
        onPress={onMix}
        style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border }]}
      >
        <IconSymbol name="antenna.radiowaves.left.and.right" size={17} color={colors.text} />
        <Typography style={[styles.actionBtnLabel, { color: colors.text }]}>Mix</Typography>
      </Pressable>
    </View>
  );
}

interface ArtistTabBarProps {
  availableTabs: string[];
  activeTab: string;
  onTabChange: (tab: any) => void;
  tabScrollRef?: React.RefObject<ScrollView | null>;
}

export function ArtistTabBar({
  availableTabs,
  activeTab,
  onTabChange,
  tabScrollRef,
}: ArtistTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.tabBarWrapper,
      {
        backgroundColor: colors.background,
        shadowColor: colors.accent,
        paddingTop: 10,
      }
    ]}>
      <ScrollView
        ref={tabScrollRef as any}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        {availableTabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => onTabChange(tab)}
              style={[
                styles.tab,
                isActive && { backgroundColor: colors.primary },
                !isActive && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
              ]}
            >
              <Typography style={[styles.tabLabel, { color: isActive ? colors.background : colors.mutedForeground, fontWeight: isActive ? '700' : '500' }]}>
                {tab}
              </Typography>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    paddingBottom: 8,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 4,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabsScroll: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    gap: 10,
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 22,
  },
  tabLabel: {
    fontSize: 14,
  },
});
