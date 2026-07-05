import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, PixelRatio } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { useAppTheme } from '@/contexts/app-theme-context';
import { type AppTrack } from '../../Tracks';
import { PlayerSheet } from './player-sheet';

interface StatsModalProps {
  visible: boolean;
  onClose: () => void;
  track: AppTrack;
}

export function StatsModal({ visible, onClose, track }: StatsModalProps) {
  const { colors } = useAppTheme();

  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(26415);
  const [bufferHealth, setBufferHealth] = useState(0.00);
  const [liveDate, setLiveDate] = useState('');

  // Generate a stable sCPN based on video ID
  const sCPN = useMemo(() => {
    const id = track.id || '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let res = '';
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) res += ' ';
      const code = id.charCodeAt(i % id.length) || 0;
      res += chars[code % chars.length];
    }
    return res;
  }, [track.id]);

  useEffect(() => {
    if (!visible) return;

    // 1. Get volume
    TrackPlayer.getVolume().then((v) => setVolume(Math.round(v * 100)));

    // 2. Poll progress and buffer health
    const progressInterval = setInterval(async () => {
      try {
        const progress = await TrackPlayer.getProgress();
        const health = Math.max(0, progress.buffered - progress.position);
        setBufferHealth(health);
      } catch (e) {}
    }, 500);

    // 3. Speed simulation
    const speedInterval = setInterval(() => {
      setSpeed((prev) => {
        const delta = Math.floor((Math.random() - 0.5) * 5000);
        return Math.max(8000, Math.min(85000, prev + delta));
      });
    }, 2000);

    // 4. Date live updates
    const dateInterval = setInterval(() => {
      const d = new Date();
      setLiveDate(d.toString().split(' (')[0]);
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(speedInterval);
      clearInterval(dateInterval);
    };
  }, [visible, track]);

  // Audio codec and itag mapping
  const activeItag = track.activeItag || 140;
  const isOpus = activeItag === 251 || activeItag === 249;
  const codecStr = isOpus ? 'opus (251)' : 'mp4a.40.2 (140)';
  
  // Audio resolution mapping
  const optimalRes = isOpus ? '160kbps' : '128kbps';
  const currentRes = optimalRes;

  const { width, height } = Dimensions.get('window');
  const screenScale = PixelRatio.get();
  const viewportStr = `${Math.round(width)}x${Math.round(height)}*${screenScale.toFixed(2)}`;

  const stats = [
    { label: 'Video ID / sCPN', value: `${track.id} / ${sCPN}` },
    { label: 'Viewport / Frames', value: `${viewportStr} / 0 dropped` },
    { label: 'Current / Optimal Res', value: `${currentRes} / ${optimalRes}` },
    { label: 'Volume / Normalized', value: `${volume}% / ${volume}% (cont. 0.0dB)` },
    { label: 'Codecs', value: codecStr },
    { label: 'Color', value: 'bt709 / bt709' },
    {
      label: 'Connection Speed',
      value: `${speed} Kbps`,
      barWidth: `${Math.min(100, (speed / 80000) * 100)}%`,
      barColor: '#34C759',
    },
    {
      label: 'Buffer Health',
      value: `${bufferHealth.toFixed(2)} s`,
      barWidth: `${Math.min(100, (bufferHealth / 30) * 100)}%`,
      barColor: '#FF9500',
    },
    { label: 'Mystery Text', value: 'SABR, s:4 t:1.85 b:0.000-22.481 P pbs:3338' },
    { label: 'Date', value: liveDate },
  ];

  return (
    <PlayerSheet visible={visible} onClose={onClose} title="Stats for Nerds">
      <View style={styles.consoleContainer}>
        {stats.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={styles.label}>{row.label}</Text>
            
            <View style={styles.valueContainer}>
              {row.barWidth && (
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: row.barWidth as any, backgroundColor: row.barColor }]} />
                </View>
              )}
              <Text style={styles.value} numberOfLines={1}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>
    </PlayerSheet>
  );
}

const styles = StyleSheet.create({
  consoleContainer: {
    backgroundColor: '#0F0F11',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#8E8E93',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '600',
    width: 140,
  },
  valueContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  value: {
    color: '#FFFFFF',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  progressBg: {
    height: 8,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
