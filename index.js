import 'expo-router/entry';
import TrackPlayer from 'react-native-track-player';
import "./global.css";
import { PlaybackService } from '@/services';

TrackPlayer.registerPlaybackService(() => PlaybackService);
