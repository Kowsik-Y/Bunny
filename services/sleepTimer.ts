import { DeviceEventEmitter } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { useState, useEffect } from 'react';
import { toast } from './toast';

export class SleepTimerManager {
  private static instance: SleepTimerManager;
  private timerId: any = null;
  private secondsRemaining: number | null = null;
  private stopAtTrackEnd = false;

  private constructor() {}

  public static getInstance(): SleepTimerManager {
    if (!SleepTimerManager.instance) {
      SleepTimerManager.instance = new SleepTimerManager();
    }
    return SleepTimerManager.instance;
  }

  public getSecondsRemaining(): number | null {
    return this.secondsRemaining;
  }

  public isAtTrackEnd(): boolean {
    return this.stopAtTrackEnd;
  }

  public start(minutes: number) {
    this.clear();
    this.secondsRemaining = minutes * 60;
    this.stopAtTrackEnd = false;
    this.emitUpdate();

    this.timerId = setInterval(() => {
      if (this.secondsRemaining !== null) {
        if (this.secondsRemaining <= 1) {
          this.triggerSleep();
        } else {
          this.secondsRemaining -= 1;
          this.emitUpdate();
        }
      }
    }, 1000);
  }

  public startAtEnd() {
    this.clear();
    this.stopAtTrackEnd = true;
    this.emitUpdate();
  }

  public clear() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.secondsRemaining = null;
    this.stopAtTrackEnd = false;
    this.emitUpdate();
  }

  public handlePlaybackStateOrTrackChange() {
    if (this.stopAtTrackEnd) {
      this.triggerSleep();
    }
  }

  private triggerSleep() {
    this.clear();
    TrackPlayer.pause().catch(() => {});
    DeviceEventEmitter.emit('sleep-timer-pause');
    toast.info('Sleep timer finished. Playback paused.');
  }

  private emitUpdate() {
    DeviceEventEmitter.emit('sleep-timer-update', {
      secondsRemaining: this.secondsRemaining,
      stopAtTrackEnd: this.stopAtTrackEnd,
    });
  }
}

export function useSleepTimer() {
  const manager = SleepTimerManager.getInstance();
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(manager.getSecondsRemaining());
  const [stopAtTrackEnd, setStopAtTrackEnd] = useState<boolean>(manager.isAtTrackEnd());

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('sleep-timer-update', (data) => {
      setSecondsRemaining(data.secondsRemaining);
      setStopAtTrackEnd(data.stopAtTrackEnd);
    });
    return () => sub.remove();
  }, []);

  return {
    secondsRemaining,
    stopAtTrackEnd,
    startTimer: (minutes: number) => manager.start(minutes),
    startAtEnd: () => manager.startAtEnd(),
    cancelTimer: () => manager.clear(),
  };
}
