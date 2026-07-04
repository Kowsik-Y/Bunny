import { DeviceEventEmitter } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { savePlayerQueue } from './state';

const originalAdd = TrackPlayer.add;
TrackPlayer.add = async function (tracks: any, insertBeforeIndex?: number) {
  const res = await originalAdd(tracks, insertBeforeIndex);
  DeviceEventEmitter.emit('queue-changed');
  savePlayerQueue();
  return res;
};

const originalRemove = TrackPlayer.remove;
TrackPlayer.remove = async function (index: any) {
  const res = await originalRemove(index);
  DeviceEventEmitter.emit('queue-changed');
  savePlayerQueue();
  return res;
};

const originalReset = TrackPlayer.reset;
TrackPlayer.reset = async function () {
  const res = await originalReset();
  DeviceEventEmitter.emit('queue-changed');
  savePlayerQueue();
  return res;
};
