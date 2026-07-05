import { useMemo } from 'react';
import { type AppTrack } from '../Tracks';

export function useQueueSplit(queue: AppTrack[], trackId: string) {
  const splitQueue = useMemo(() => {
    const activeIdx = queue.findIndex(t => t.id === trackId);
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
  }, [queue, trackId]);

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

  return {
    splitQueue,
    upNextBounds,
    dynamicBounds,
  };
}
