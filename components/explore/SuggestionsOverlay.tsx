import { IconSymbol } from '@/components/ui/icon-symbol';
import { Typography } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface SuggestionsOverlayProps {
  suggestions: string[];
  showSuggestions: boolean;
  onSearch: (query: string) => void;
  isRecent?: boolean;
  onClearRecent?: () => void;
  onDismiss?: () => void;
}

export function SuggestionsOverlay({
  suggestions,
  showSuggestions,
  onSearch,
  isRecent = false,
  onClearRecent,
  onDismiss,
}: SuggestionsOverlayProps) {
  const { colors } = useAppTheme();

  if (!showSuggestions) return null;
  if (suggestions.length === 0) return null;

  return (
    <>
      {/* Backdrop to dismiss when clicking outside */}
      <Pressable style={styles.backdrop} onPress={onDismiss} />

      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={[
          styles.suggestionsModal,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: '#000',
          },
        ]}
      >
        {isRecent && (
          <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
            <Typography variant="small" style={styles.headerLabel}>
              RECENT SEARCHES
            </Typography>
            {onClearRecent && (
              <Pressable onPress={onClearRecent} hitSlop={8}>
                <Typography variant="small" style={{ color: colors.primary, fontWeight: '600', fontSize: 11 }}>
                  Clear All
                </Typography>
              </Pressable>
            )}
          </View>
        )}
        <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          {suggestions.map((sug, i) => (
            <Pressable
              key={i}
              style={[
                styles.suggestionItem,
                { borderBottomWidth: i === suggestions.length - 1 ? 0 : 1, borderBottomColor: colors.border },
              ]}
              android_ripple={{
                color: colors.accent,
              }}
              onPress={() => onSearch(sug)}
            >
              {isRecent ? (
                <Feather
                  name="clock"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
              ) : (
                <IconSymbol
                  name="magnifyingglass"
                  size={18}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
              )}
              <Typography style={{ color: colors.text, fontSize: 15, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                {sug}
              </Typography>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 52, // Below the search input so clicking input/clear buttons still works
    bottom: -1000,
    left: -100,
    right: -100,
    zIndex: 99,
  },
  suggestionsModal: {
    position: 'absolute',
    top: 56, // Sits exactly below the 46px height search bar with some gap
    left: 20,
    right: 20,
    maxHeight: 280,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 100,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
    opacity: 0.6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
