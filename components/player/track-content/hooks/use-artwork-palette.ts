import { useState, useEffect } from 'react';
import ImageColors from 'react-native-image-colors';
import { type AppTrack } from '../../Tracks';
import { type Palette } from '../types';

const FALLBACK: Palette = ['#121212', '#181818', '#000000', '#0a0a0a'];
let globalPalette: Palette = FALLBACK;
const globalCache: Record<string, Palette> = {};

export function useArtworkPalette(uri?: string, track?: AppTrack, queue?: AppTrack[]) {
  const [palette, setPalette] = useState<Palette>(globalPalette);

  useEffect(() => {
    // No artwork: after a short delay fall back, but only if we don't have real
    // colors from a previous track already showing.
    if (!uri) {
      const t = setTimeout(() => {
        globalPalette = FALLBACK;
        setPalette(FALLBACK);
      }, 800);
      return () => clearTimeout(t);
    }

    // Already cached — switch instantly (transition animation in TrackContent handles the fade)
    if (globalCache[uri]) {
      globalPalette = globalCache[uri];
      setPalette(globalCache[uri]);
      return;
    }

    // Not cached yet: DO NOT reset palette here — keep whatever we're showing
    // so there's no flash back to #121212 while the new image loads.
    let active = true;
    ImageColors.getColors(uri, {
      fallback: FALLBACK[0],
      cache: true,
      key: uri,
    })
      .then((colors) => {
        if (!active) return;
        let newPalette: Palette;
        if (colors.platform === 'android' || colors.platform === 'web') {
          const c0 = colors.vibrant ?? colors.lightVibrant;
          const c1 = colors.lightVibrant ?? colors.vibrant;
          const c2 = colors.muted ?? colors.darkMuted;
          const c3 = colors.lightMuted;
          if (!c0 || !c2) return;
          newPalette = [c0, c1 ?? c0, c2, c3 ?? c2];
        } else if (colors.platform === 'ios') {
          const c0 = colors.primary;
          const c1 = colors.secondary;
          const c2 = colors.background;
          const c3 = colors.detail;
          if (!c0 || !c2) return;
          newPalette = [c0, c1 ?? c0, c2, c3 ?? c2];
        } else {
          return;
        }
        globalCache[uri] = newPalette;
        globalPalette = newPalette;
        setPalette(newPalette);
      })
      .catch((err) => console.log('[useArtworkPalette] fetch error:', err));

    return () => {
      active = false;
    };
  }, [uri]);

  // Pre-fetching adjacent tracks
  useEffect(() => {
    if (!queue || queue.length === 0 || !track) return;
    const currentIndex = queue.findIndex((t) => t.id === track.id);
    if (currentIndex === -1) return;

    const prefetchTrack = (targetTrack: AppTrack) => {
      if (targetTrack && targetTrack.artwork) {
        const targetUri = targetTrack.artwork as string;
        if (!globalCache[targetUri]) {
          ImageColors.getColors(targetUri, {
            fallback: FALLBACK[0],
            cache: true,
            key: targetUri,
          })
            .then((colors) => {
              let newPalette: Palette;
              if (colors.platform === 'android' || colors.platform === 'web') {
                const c0 = colors.vibrant ?? colors.lightVibrant;
                const c1 = colors.lightVibrant ?? colors.vibrant;
                const c2 = colors.muted ?? colors.darkMuted;
                const c3 = colors.lightMuted;
                if (!c0 || !c2) return;
                newPalette = [c0, c1 ?? c0, c2, c3 ?? c2];
              } else if (colors.platform === 'ios') {
                const c0 = colors.primary;
                const c1 = colors.secondary;
                const c2 = colors.background;
                const c3 = colors.detail;
                if (!c0 || !c2) return;
                newPalette = [c0, c1 ?? c0, c2, c3 ?? c2];
              } else {
                return;
              }
              globalCache[targetUri] = newPalette;
            })
            .catch(() => {});
        }
      }
    };

    if (currentIndex + 1 < queue.length) {
      prefetchTrack(queue[currentIndex + 1]);
    }
    if (currentIndex - 1 >= 0) {
      prefetchTrack(queue[currentIndex - 1]);
    }
  }, [track?.id, queue]);

  return palette;
}
export { FALLBACK };
export type { Palette };
