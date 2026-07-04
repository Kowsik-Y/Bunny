import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  DeviceEventEmitter,
  Image,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  ShadowDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import TrackPlayer from 'react-native-track-player';
import { Feather } from '@expo/vector-icons';
import { GripVertical, Trash2, X } from 'lucide-react-native';
import { Typography as Text } from '@/components/ui/typography';
import { useQueue } from '@/services';
import { type AppTrack } from './Tracks';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

// Fixed row heights used by getItemLayout to avoid per-render measurement
const ITEM_HEIGHT   = 62;  // trackRow: paddingVertical(8*2) + art(40) + marginBottom(6)
const HEADER_HEIGHT = 42;  // section header row
const EMPTY_HEIGHT  = 50;  // empty-state placeholder

// ── Skeleton loader ───────────────────────────────────────────────────────────
const SkeletonRow = React.memo(({ opacity, delay }: { opacity: Animated.Value; delay: number }) => {
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 0.15, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity, delay]);

  return (
    <Animated.View style={[skeletonStyles.row, { opacity }]}>
      <View style={skeletonStyles.art} />
      <View style={skeletonStyles.info}>
        <View style={[skeletonStyles.line, { width: '65%' }]} />
        <View style={[skeletonStyles.line, { width: '40%', marginTop: 6, opacity: 0.6 }]} />
      </View>
      <View style={skeletonStyles.grip} />
    </Animated.View>
  );
});

const SKELETON_COUNT = 6;
const skeletonOpacities = Array.from({ length: SKELETON_COUNT }, () => new Animated.Value(0.3));

function QueueSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      <View style={skeletonStyles.sectionHeader} />
      {skeletonOpacities.map((op, i) => (
        <SkeletonRow key={i} opacity={op} delay={i * 80} />
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: {
    width: width - 32,
    height: '100%',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  sectionHeader: {
    height: 12,
    width: 80,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  art: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 12,
  },
  info: { flex: 1 },
  line: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  grip: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 12,
  },
});

// ── flat-list row types ──────────────────────────────────────────────────────
type HeaderRow = {
  type: 'header';
  key: string;
  title: string;
  sectionType?: 'upNext' | 'dynamic';
  showClear?: boolean;
};
type EmptyRow = { type: 'empty'; key: string; text: string };
type TrackRow = {
  type: 'item';
  key: string;
  item: AppTrack;
  originalIndex: number;
  localIdx: number;
  isHistory: boolean;
  isNowPlaying: boolean;
  sectionStart: number;
  sectionEnd: number;
};
type FlatRow = HeaderRow | EmptyRow | TrackRow;

// ── QueueItemRow ─────────────────────────────────────────────────────────────
const QueueItemRow = React.memo(({
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
  const rowHeight = useSharedValue(62); // 62 matches standard row height (item height + margin collapse)
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
                <Feather name="volume-2" size={16} color={primaryColor} style={{ marginRight: 8 }} />
              )}
            </Pressable>
          </Swipeable>
        </Reanimated.View>
      </ScaleDecorator>
    </ShadowDecorator>
  );
// Custom equality: skip re-renders when only `drag` changes and the row is
// not (and wasn't) being dragged; also compare trackRow by field values instead
// of reference so new flatQueueData objects don't force all rows to re-render.
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
    pr.item.artist   !== nr.item.artist   ||
    pr.item.artwork  !== nr.item.artwork
  ) return false;
  if (prev.isActive          !== next.isActive)          return false;
  if (prev.primaryColor      !== next.primaryColor)      return false;
  if (prev.onSkipToTrack     !== next.onSkipToTrack)     return false;
  if (prev.handleRemoveTrack !== next.handleRemoveTrack) return false;
  // Only care about drag identity when this row is (or was) active
  if (prev.isActive || next.isActive) return prev.drag === next.drag;
  return true;
});

interface QueueTabProps {
  track: AppTrack;
  onSkipToTrack: (id: string) => void;
  primaryColor: string;
  isVisible?: boolean;
}

export default function QueueTab({ track, onSkipToTrack, primaryColor, isVisible = true }: QueueTabProps) {
  const queue = useQueue();
  const listRef = useRef<any>(null);

  // Show skeleton while the tab-switch animation settles and the queue hook
  // hydrates. A short timeout defers the heavy DraggableFlatList mount until
  // after ongoing animations complete, preventing stutter when switching tabs.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // 300 ms covers a typical tab-switch animation; the 500 ms fallback
    // ensures we never stay in skeleton state indefinitely.
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── queue split ────────────────────────────────────────────────────────────
  const splitQueue = useMemo(() => {
    const activeIdx = queue.findIndex(t => t.id === track.id);
    const previous = activeIdx !== -1 ? queue.slice(0, activeIdx) : [];
    const current = activeIdx !== -1 ? queue[activeIdx] : null;
    const remaining = activeIdx !== -1 ? queue.slice(activeIdx + 1) : queue;

    const previousWithIdx = previous.map((t, idx) => ({ track: t, originalIndex: idx }));
    const upNext: { track: AppTrack; originalIndex: number }[] = [];
    const dynamicQueue: { track: AppTrack; originalIndex: number }[] = [];

    remaining.forEach((t, idx) => {
      const originalIndex = (activeIdx !== -1 ? activeIdx + 1 : 0) + idx;
      if (t.isAutoplay) {
        dynamicQueue.push({ track: t, originalIndex });
      } else {
        upNext.push({ track: t, originalIndex });
      }
    });

    return {
      previous: previousWithIdx,
      current: current ? { track: current, originalIndex: activeIdx } : null,
      upNext,
      dynamicQueue,
    };
  }, [queue, track.id]);

  const upNextBounds = useMemo(() => {
    if (splitQueue.upNext.length === 0) return { start: -1, end: -1 };
    return {
      start: splitQueue.upNext[0].originalIndex,
      end: splitQueue.upNext[splitQueue.upNext.length - 1].originalIndex,
    };
  }, [splitQueue.upNext]);

  const dynamicBounds = useMemo(() => {
    if (splitQueue.dynamicQueue.length === 0) return { start: -1, end: -1 };
    return {
      start: splitQueue.dynamicQueue[0].originalIndex,
      end: splitQueue.dynamicQueue[splitQueue.dynamicQueue.length - 1].originalIndex,
    };
  }, [splitQueue.dynamicQueue]);

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleMoveTrack = useCallback(async (fromIndex: number, toIndex: number) => {
    try {
      if (toIndex < 0 || toIndex >= queue.length || toIndex === fromIndex) return;
      await TrackPlayer.move(fromIndex, toIndex);
      DeviceEventEmitter.emit('queue-changed');
    } catch (e: any) {
      console.warn('[QueueTab] Failed to move track:', e.message);
    }
  }, [queue.length]);

  const handleRemoveTrack = useCallback(async (index: number) => {
    try {
      await TrackPlayer.remove(index);
      DeviceEventEmitter.emit('queue-changed');
    } catch (e: any) {
      console.warn('[QueueTab] Failed to remove track:', e.message);
    }
  }, []);

  const handleClearSection = useCallback(async (section: 'upNext' | 'dynamic') => {
    try {
      const activeIdx = queue.findIndex(t => t.id === track.id);
      if (activeIdx === -1) return;

      const toRemove: number[] = [];
      queue.forEach((t, idx) => {
        if (idx > activeIdx) {
          if (section === 'dynamic' && t.isAutoplay) {
            toRemove.push(idx);
          } else if (section === 'upNext' && !t.isAutoplay) {
            toRemove.push(idx);
          }
        }
      });

      if (toRemove.length > 0) {
        toRemove.sort((a, b) => b - a);
        for (const idx of toRemove) {
          await TrackPlayer.remove(idx);
        }
        DeviceEventEmitter.emit('queue-changed');
      }
    } catch (e: any) {
      console.warn(`[QueueTab] Failed to clear section ${section}:`, e.message);
    }
  }, [queue, track.id]);

  // ── flat list data ─────────────────────────────────────────────────────────
  const flatQueueData = useMemo<FlatRow[]>(() => {
    const list: FlatRow[] = [];

    if (splitQueue.previous.length > 0) {
      list.push({ type: 'header', key: 'header-prev', title: `History (${splitQueue.previous.length})` });
      splitQueue.previous.forEach((itemObj) => {
        list.push({
          type: 'item',
          key: `prev-${itemObj.track?.id ?? 'track'}-${itemObj.originalIndex}`,
          item: itemObj.track,
          originalIndex: itemObj.originalIndex,
          localIdx: -1,
          isHistory: true,
          isNowPlaying: false,
          sectionStart: -1,
          sectionEnd: -1,
        });
      });
    }

    if (splitQueue.current) {
      list.push({ type: 'header', key: 'header-current', title: 'Now Playing' });
      list.push({
        type: 'item',
        key: `current-${splitQueue.current.track?.id ?? 'track'}-${splitQueue.current.originalIndex}`,
        item: splitQueue.current.track,
        originalIndex: splitQueue.current.originalIndex,
        localIdx: -1,
        isHistory: false,
        isNowPlaying: true,
        sectionStart: -1,
        sectionEnd: -1,
      });
    }

    list.push({
      type: 'header',
      key: 'header-upnext',
      title: `Up Next (${splitQueue.upNext.length})`,
      sectionType: 'upNext',
      showClear: splitQueue.upNext.length > 0,
    });

    if (splitQueue.upNext.length === 0) {
      list.push({ type: 'empty', key: 'empty-upnext', text: 'No tracks in Up Next' });
    } else {
      splitQueue.upNext.forEach((itemObj, localIdx) => {
        list.push({
          type: 'item',
          key: `upnext-${itemObj.track?.id ?? 'track'}-${itemObj.originalIndex}`,
          item: itemObj.track,
          originalIndex: itemObj.originalIndex,
          localIdx,
          isHistory: false,
          isNowPlaying: false,
          sectionStart: upNextBounds.start,
          sectionEnd: upNextBounds.end,
        });
      });
    }

    list.push({
      type: 'header',
      key: 'header-dynamic',
      title: `Dynamic Radio Queue (${splitQueue.dynamicQueue.length})`,
      sectionType: 'dynamic',
      showClear: splitQueue.dynamicQueue.length > 0,
    });

    if (splitQueue.dynamicQueue.length === 0) {
      list.push({ type: 'empty', key: 'empty-dynamic', text: 'Autoplay suggestions will appear here' });
    } else {
      splitQueue.dynamicQueue.forEach((itemObj, localIdx) => {
        list.push({
          type: 'item',
          key: `dynamic-${itemObj.track?.id ?? 'track'}-${itemObj.originalIndex}`,
          item: itemObj.track,
          originalIndex: itemObj.originalIndex,
          localIdx,
          isHistory: false,
          isNowPlaying: false,
          sectionStart: dynamicBounds.start,
          sectionEnd: dynamicBounds.end,
        });
      });
    }

    return list;
  }, [splitQueue, upNextBounds, dynamicBounds]);

  // ── stable callback refs ──────────────────────────────────────────────────
  // Storing mutable callbacks in refs lets renderItem stay stable across queue
  // changes, which prevents all list rows from re-rendering on every update.
  const handleClearSectionRef = useRef(handleClearSection);
  handleClearSectionRef.current = handleClearSection;

  const handleRemoveTrackRef = useRef(handleRemoveTrack);
  handleRemoveTrackRef.current = handleRemoveTrack;

  const onSkipToTrackRef = useRef(onSkipToTrack);
  onSkipToTrackRef.current = onSkipToTrack;

  // Precomputed row heights for getItemLayout – O(n) once per flatQueueData
  // change, avoids DraggableFlatList measuring each row on every render.
  const itemLayouts = useMemo(() => {
    let offset = 0;
    return flatQueueData.map((item, index) => {
      const length =
        item.type === 'header' ? HEADER_HEIGHT :
        item.type === 'empty'  ? EMPTY_HEIGHT  :
        ITEM_HEIGHT;
      const layout = { length, offset, index };
      offset += length;
      return layout;
    });
  }, [flatQueueData]);

  const getItemLayout = useCallback(
    (_data: any, index: number) =>
      itemLayouts[index] ?? { length: ITEM_HEIGHT, offset: index * ITEM_HEIGHT, index },
    [itemLayouts],
  );

  const hasScrolledRef = useRef(false);

  // Scroll to "Now Playing" header only when the queue tab initially becomes visible
  useEffect(() => {
    if (!isVisible) {
      hasScrolledRef.current = false;
      return;
    }

    if (isVisible && !loading && !hasScrolledRef.current && flatQueueData.length > 0) {
      const idx = flatQueueData.findIndex(item => item.key === 'header-current');
      if (idx !== -1) {
        hasScrolledRef.current = true;
        const t = setTimeout(() => {
          try {
            listRef.current?.scrollToIndex({
              index: idx,
              animated: true,
              viewPosition: 0,
            });
          } catch (err) {
            // Fallback: estimate layout offset if scrollToIndex is not yet fully measured/fails
            let offset = 0;
            for (let i = 0; i < idx; i++) {
              const item = flatQueueData[i];
              if (item.type === 'header') {
                offset += 42;
              } else if (item.type === 'empty') {
                offset += 50;
              } else {
                offset += 62;
              }
            }
            listRef.current?.scrollToOffset({ offset, animated: true });
          }
        }, 80);
        return () => clearTimeout(t);
      }
    }
  }, [loading, flatQueueData, isVisible]);

  // ── drag end handler ───────────────────────────────────────────────────────
  // Strategy: use `from` (original flat index) to identify the dragged item,
  // then count how many same-section items exist between `from` and `to` in the
  // original flat list. That count becomes the step delta for TrackPlayer.move.
  // This naturally prevents cross-section moves since items from other sections
  // are skipped in the count, and clamping keeps the result within bounds.
  const onDragEnd = useCallback(
    ({ from, to }: { data: FlatRow[]; from: number; to: number }) => {
      if (from === to) return;

      const draggedRow = flatQueueData[from];
      if (!draggedRow || draggedRow.type !== 'item') return;

      const { originalIndex: fromQueueIdx, sectionStart, sectionEnd, isHistory, isNowPlaying } =
        draggedRow;

      // Only allow dragging upNext and dynamic items
      if (isHistory || isNowPlaying || sectionStart === -1) return;

      const direction = to > from ? 1 : -1;
      const [rangeStart, rangeEnd] = direction > 0 ? [from + 1, to] : [to, from - 1];

      // Count same-section items the drag crossed
      let steps = 0;
      for (let i = rangeStart; i <= rangeEnd; i++) {
        const row = flatQueueData[i];
        if (
          row?.type === 'item' &&
          !row.isHistory &&
          !row.isNowPlaying &&
          row.sectionStart === sectionStart
        ) {
          steps++;
        }
      }

      if (steps === 0) return; // Dropped on a header / same effective position

      const toQueueIdx = Math.min(
        Math.max(fromQueueIdx + direction * steps, sectionStart),
        sectionEnd,
      );

      if (toQueueIdx !== fromQueueIdx) {
        handleMoveTrack(fromQueueIdx, toQueueIdx);
      }
    },
    [flatQueueData, handleMoveTrack],
  );

  // ── render item ────────────────────────────────────────────────────────────
  // Deps intentionally exclude handleClearSection, handleRemoveTrack, and
  // onSkipToTrack — they're accessed via stable refs to prevent all rows from
  // re-rendering on every queue update.
  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<FlatRow>) => {
      if (item.type === 'header') {
        const h = item as HeaderRow;
        return (
          <View
            style={[
              styles.queueSectionHeaderRow,
              item.key !== 'header-prev' && { marginTop: 12 },
            ]}
          >
            <Text style={styles.queueSectionHeader}>{h.title}</Text>
            {h.showClear && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleClearSectionRef.current(h.sectionType!)}
                style={styles.clearBtn}
              >
                <X size={15} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        );
      }

      if (item.type === 'empty') {
        return <Text style={styles.emptySectionText}>{(item as EmptyRow).text}</Text>;
      }

      return (
        <QueueItemRow
          trackRow={item as TrackRow}
          drag={drag}
          isActive={isActive}
          onSkipToTrack={onSkipToTrackRef.current}
          handleRemoveTrack={handleRemoveTrackRef.current}
          primaryColor={primaryColor}
        />
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [primaryColor],
  );

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) return <QueueSkeleton />;

  return (
    <View style={styles.queueContainer}>
      <DraggableFlatList
        ref={listRef}
        data={flatQueueData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        onDragEnd={onDragEnd}
        getItemLayout={getItemLayout}
        contentContainerStyle={styles.queueContent}
        showsVerticalScrollIndicator={false}
        activationDistance={10}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={false}
      />
    </View>
  );
}

// ── styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  queueContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  queueContent: {
    paddingBottom: 20,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  queueArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  queueInfo: {
    flex: 1,
  },
  queueItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  queueItemArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  queueSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  queueSectionHeader: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptySectionText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 12,
    paddingHorizontal: 12,
    textAlign: 'left',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%',
    borderRadius: 8,
    marginBottom: 6,
  },
});