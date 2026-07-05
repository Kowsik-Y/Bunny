import { useState, useEffect } from 'react';
import TrackPlayer from 'react-native-track-player';
import { useVideoPlayer } from 'expo-video';
import { type AppTrack } from '../../Tracks';
import { setVideoQualityChanging } from '@/services/PlaybackService';
import { toast } from '@/services';

export function usePlayerSync(
  track: AppTrack,
  position: number,
  isPlaying: boolean,
  onPlayPause: () => void,
  onVideoModeChange?: (info: { isVideo: boolean; playPause: () => void }) => void
) {
  const [playerMode, setPlayerMode] = useState<'audio' | 'video'>('audio');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoTime, setVideoTime] = useState(position);

  const videoPlayer = useVideoPlayer(track.videoUrl ?? '', (player) => {
    player.loop = false;
    player.muted = false;
  });

  useEffect(() => {
    const subscription = videoPlayer.addListener('playingChange', (event: any) => {
      setIsVideoPlaying(!!event?.isPlaying);
    });
    return () => subscription.remove();
  }, [videoPlayer]);

  useEffect(() => {
    if (playerMode === 'video') {
      TrackPlayer.pause().then(() => {
        videoPlayer.currentTime = position;
        if (isPlaying) {
          videoPlayer.play();
        } else {
          videoPlayer.pause();
        }
      }).catch(() => {
        videoPlayer.currentTime = position;
      });
    } else {
      videoPlayer.pause();
      const videoCurrentTime = videoPlayer.currentTime;
      if (videoCurrentTime > 0 && Math.abs(videoCurrentTime - position) > 1.0) {
        TrackPlayer.seekTo(videoCurrentTime).then(() => {
          if (isVideoPlaying) {
            TrackPlayer.play();
          }
        });
      } else if (isVideoPlaying && !isPlaying) {
        TrackPlayer.play();
      }
    }
  }, [playerMode]);

  useEffect(() => {
    if (playerMode !== 'video') return;
    const interval = setInterval(() => {
      setVideoTime(videoPlayer.currentTime);
    }, 250);
    return () => clearInterval(interval);
  }, [playerMode, videoPlayer]);

  useEffect(() => {
    if (!onVideoModeChange) return;
    if (playerMode === 'video') {
      onVideoModeChange({
        isVideo: true,
        playPause: () => {
          if (videoPlayer.playing) {
            videoPlayer.pause();
          } else {
            videoPlayer.play();
          }
        },
      });
    } else {
      onVideoModeChange({ isVideo: false, playPause: onPlayPause });
    }
  }, [playerMode, videoPlayer, onPlayPause, onVideoModeChange]);

  useEffect(() => {
    setPlayerMode('audio');
    videoPlayer.replaceAsync(track.videoUrl ?? '').then(() => {
      try {
        videoPlayer.muted = false;
        videoPlayer.volume = 1;
      } catch (_) { }
    }).catch((err: any) => {
      console.warn('[videoPlayer] replaceAsync on track change failed:', err?.message);
    });
  }, [track.id]);

  const changeAudioQuality = async (formatUrl: string, itag: number) => {
    try {
      const progress = await TrackPlayer.getProgress();
      const currentPos = progress.position;
      const isCurrentlyPlaying = (await TrackPlayer.getPlaybackState()).state === 'playing';

      await TrackPlayer.pause();

      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (activeIndex !== undefined && activeIndex !== null && activeIndex >= 0) {
        const queue = await TrackPlayer.getQueue();
        const currentTrackObj = queue[activeIndex];
        const updatedTrack = {
          ...currentTrackObj,
          url: formatUrl,
          activeItag: itag,
        };
        await TrackPlayer.add([updatedTrack], activeIndex);
        await TrackPlayer.skip(activeIndex);
        await TrackPlayer.remove(activeIndex + 1);

        if (currentPos > 0) {
          await TrackPlayer.seekTo(currentPos);
        }

        if (isCurrentlyPlaying) {
          await TrackPlayer.play();
        }
        toast.success('Audio quality updated successfully!');
      }
    } catch (e: any) {
      console.error('Failed to change audio quality:', e);
      toast.error('Failed to change audio quality');
    }
  };

  const changeVideoQuality = async (formatUrl: string, itag: number) => {
    const player = videoPlayer;
    try {
      const currentPos = player.currentTime;
      const isCurrentlyPlaying = isVideoPlaying;

      player.pause();
      setVideoQualityChanging(true);

      try {
        const activeIndex = await TrackPlayer.getActiveTrackIndex();
        if (activeIndex !== undefined && activeIndex !== null && activeIndex >= 0) {
          const queue = await TrackPlayer.getQueue();
          const currentTrackObj = queue[activeIndex];
          const updatedTrack = {
            ...currentTrackObj,
            videoUrl: formatUrl,
            activeVideoItag: itag,
          };
          await TrackPlayer.add([updatedTrack], activeIndex);
          await TrackPlayer.skip(activeIndex);
          await TrackPlayer.remove(activeIndex + 1);
          await TrackPlayer.pause();
        }
      } finally {
        setVideoQualityChanging(false);
      }

      await player.replaceAsync(formatUrl);

      try {
        player.muted = false;
        player.volume = 1;
        player.currentTime = currentPos;
        if (isCurrentlyPlaying) {
          player.play();
        }
      } catch (seekErr: any) {
        console.warn('[changeVideoQuality] Seek after replace failed (player released):', seekErr?.message);
      }

      toast.success('Video quality updated successfully!');
    } catch (e: any) {
      setVideoQualityChanging(false);
      console.error('Failed to change video quality:', e);
      toast.error('Failed to change video quality');
    }
  };

  return {
    playerMode,
    setPlayerMode,
    isVideoPlaying,
    setIsVideoPlaying,
    videoTime,
    setVideoTime,
    videoPlayer,
    changeAudioQuality,
    changeVideoQuality,
  };
}
