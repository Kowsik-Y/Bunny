import { useState, useCallback } from 'react';
import { resolveAudio } from './resolver';

export { resolveAudio };

export function useYouTubeAudio() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolve = useCallback(async (videoId: string) => {
    setLoading(true);
    setError(null);
    try {
      return await resolveAudio(videoId);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);
  return { resolve, loading, error };
}

export default useYouTubeAudio;
