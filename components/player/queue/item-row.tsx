import React, { useState, useEffect } from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { ScaleDecorator, ShadowDecorator } from 'react-native-draggable-flatlist';
import { Trash2, Volume2 } from 'lucide-react-native';
import { Typography as Text } from '@/components/ui/typography';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { TrackRow } from './types';
import { styles } from './styles';

export const QueueItemRow = React.memo(({
  trackRow,
  drag,
  isActive,
  onSkipToTrack,
  handleRemoveTrack,
  primaryColor,
}: {
  trackRow: TrackRow;
  drag: () => void;
  isActive: boolean;
  onSkipToTrack: (id: string) => void;
  handleRemoveTrack: (index: number) => void;
  primaryColor: string;
}) => {
  const { item, originalIndex, isHistory, isNowPlaying } = trackRow;
  const canDrag = !isHistory && !isNowPlaying;

  const [isDeleting, setIsDeleting] = useState(false);
  const rowHeight = useSharedValue(62);
  const rowOpacity = useSharedValue(1);

  useEffect(() => {
    if (isDeleting) {
      rowHeight.value = withTiming(0, { duration: 180 });
      rowOpacity.value = withTiming(0, { duration: 180 }, (finished) => {
        if (finished) {
          runOnJS(handleRemoveTrack)(originalIndex);
        }
      });
    }
  }, [isDeleting]);

  const animatedRowStyle = useAnimatedStyle(() => ({
    height: rowHeight.value,
    opacity: rowOpacity.value,
    overflow: 'hidden',
  }));

  const renderDeleteAction = () => (
    <View style={styles.deleteAction}>
      <Trash2 size={18} color="#FF3B3099" />
    </View>
  );

  return (
    <ShadowDecorator>
      <ScaleDecorator activeScale={1.02}>
        <Reanimated.View style={animatedRowStyle}>
          <Swipeable
            enabled={canDrag && !isActive && !isDeleting}
            renderLeftActions={renderDeleteAction}
            renderRightActions={renderDeleteAction}
            onSwipeableOpen={() => {
              setIsDeleting(true);
            }}
            friction={1.2}
            leftThreshold={65}
            rightThreshold={65}
            containerStyle={{ overflow: 'hidden' }}
          >
            <Pressable
              onPress={() => !isActive && !isDeleting && onSkipToTrack(item.id)}
              onLongPress={canDrag && !isDeleting ? drag : undefined}
              delayLongPress={220}
              android_ripple={!isActive ? { foreground: true, color: '#ffffff40' } : undefined}
              style={[
                styles.queueItem,
                isHistory && { opacity: 0.45 },
                isNowPlaying && {
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                },
                isActive && {
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderRadius: 8,
                },
              ]}
            >
              <Image
                source={
                  item.artwork && (item.artwork as string).trim() !== ''
                    ? { uri: item.artwork as string }
                    : require('@/assets/images/icon.png')
                }
                style={styles.queueArt}
              />
              <View style={styles.queueInfo}>
                <Text
                  style={[styles.queueItemTitle, isNowPlaying && { fontWeight: '700' }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={styles.queueItemArtist} numberOfLines={1}>
                  {item.artist}
                </Text>
              </View>

              {isNowPlaying && (
                <Volume2 size={16} color="#fff" style={{ marginRight: 8 }} />
              )}
            </Pressable>
          </Swipeable>
        </Reanimated.View>
      </ScaleDecorator>
    </ShadowDecorator>
  );
}, (prev, next) => {
  const pr = prev.trackRow;
  const nr = next.trackRow;
  if (
    pr.key           !== nr.key           ||
    pr.originalIndex !== nr.originalIndex ||
    pr.isHistory     !== nr.isHistory     ||
    pr.isNowPlaying  !== nr.isNowPlaying  ||
    pr.item.id       !== nr.item.id       ||
    pr.item.title    !== nr.item.title    ||
    pr.item.artist   !== nr.item.artist    ||
    pr.item.artwork  !== nr.item.artwork
  ) return false;
  if (prev.isActive          !== next.isActive)          return false;
  if (prev.primaryColor      !== next.primaryColor)      return false;
  if (prev.onSkipToTrack     !== next.onSkipToTrack)     return false;
  if (prev.handleRemoveTrack !== next.handleRemoveTrack) return false;
  if (prev.isActive || next.isActive) return prev.drag === next.drag;
  return true;
});
