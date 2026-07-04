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
      for (let i = 0; i < toRemove; i++) {
        await TrackPlayer.remove(0);
      }
      console.log(`[PlaybackService] History trimmed: removed ${toRemove} old tracks (cap=${dynamicCap}).`);
    }
  } catch (e: any) {
    console.warn('[PlaybackService] trimHistory failed:', e.message);
  }
}
