import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  DeviceEventEmitter,
  TouchableOpacity,
  View,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import TrackPlayer from 'react-native-track-player';
import { X } from 'lucide-react-native';
import { Typography as Text } from '@/components/ui/typography';
import { useQueue } from '@/services';
import { type AppTrack } from '../Tracks';
import { QueueSkeleton } from './skeleton';
import { QueueItemRow } from './item-row';
import { useQueueSplit } from './use-queue-split';
import { useDragHandler } from './use-drag-handler';
import { FlatRow, HeaderRow, EmptyRow, TrackRow } from './types';
import { styles } from './styles';

const ITEM_HEIGHT   = 62;
const HEADER_HEIGHT = 42;
const EMPTY_HEIGHT  = 50;

interface QueueTabProps {
  track: AppTrack;
  onSkipToTrack: (id: string) => void;
  primaryColor: string;
  isVisible?: boolean;
}

export default function QueueTab({ track, onSkipToTrack, primaryColor, isVisible = true }: QueueTabProps) {
  const queue = useQueue();
  const listRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  const { splitQueue, upNextBounds, dynamicBounds } = useQueueSplit(queue, track.id);

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

  const { handleRemoveTrack, onDragEnd } = useDragHandler(queue, flatQueueData);

  const handleClearSectionRef = useRef(handleClearSection);
  handleClearSectionRef.current = handleClearSection;

  const handleRemoveTrackRef = useRef(handleRemoveTrack);
  handleRemoveTrackRef.current = handleRemoveTrack;

  const onSkipToTrackRef = useRef(onSkipToTrack);
  onSkipToTrackRef.current = onSkipToTrack;

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
                <X size={15} color="#FF3B3099" />
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
    [primaryColor],
  );

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
        initialNumToRender={20}
        maxToRenderPerBatch={20}
        windowSize={15}
        removeClippedSubviews={false}
      />
    </View>
  );
}
