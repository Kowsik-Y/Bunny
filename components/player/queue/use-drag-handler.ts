import { useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { type AppTrack } from '../Tracks';
import { FlatRow } from './types';

export function useDragHandler(queue: AppTrack[], flatQueueData: FlatRow[]) {
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

  const onDragEnd = useCallback(
    ({ from, to }: { data: FlatRow[]; from: number; to: number }) => {
      if (from === to) return;

      const draggedRow = flatQueueData[from];
      if (!draggedRow || draggedRow.type !== 'item') return;

      const { originalIndex: fromQueueIdx, sectionStart, sectionEnd, isHistory, isNowPlaying } =
        draggedRow;

      if (isHistory || isNowPlaying || sectionStart === -1) return;

      const direction = to > from ? 1 : -1;
      const [rangeStart, rangeEnd] = direction > 0 ? [from + 1, to] : [to, from - 1];

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

      if (steps === 0) return;

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

  return {
    handleMoveTrack,
    handleRemoveTrack,
    onDragEnd,
  };
}
