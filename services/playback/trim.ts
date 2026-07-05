import TrackPlayer from 'react-native-track-player';

const BASE_HISTORY_LIMIT = 10;

export async function trimHistory(): Promise<void> {
  try {
    const queue = await TrackPlayer.getQueue();
    const activeIndex = await TrackPlayer.getActiveTrackIndex();
    if (activeIndex === undefined || activeIndex === null || activeIndex <= 0) return;

    const dynamicCap = Math.max(5, BASE_HISTORY_LIMIT - Math.floor(queue.length / 10));
    const historyCount = activeIndex;

    if (historyCount > dynamicCap) {
      const toRemove = historyCount - dynamicCap;
      const indices = Array.from({ length: toRemove }, (_, i) => i);
      await TrackPlayer.remove(indices);
      console.log(`[PlaybackService] History trimmed: removed ${toRemove} old tracks (cap=${dynamicCap}).`);
    }
  } catch (e: any) {
    console.warn('[PlaybackService] trimHistory failed:', e.message);
  }
}
