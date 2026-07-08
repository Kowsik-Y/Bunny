import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import TrackPlayer, { Event, useTrackPlayerEvents, PlaybackState, State } from 'react-native-track-player';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { usePartyStore } from './partyStore';
import { PartyManager } from './PartyManager';

export function usePartyPlayerSync() {
  const { partyMode, connectionState, discoveredHosts, clockOffset } = usePartyStore();
  
  // Track previous playback state to avoid redundant broadcast loops
  const lastStateRef = useRef<State | string>('');
  const lastTrackIdRef = useRef<string>('');

  // 1. Host Mode: Monitor local player actions and broadcast
  useTrackPlayerEvents(
    [Event.PlaybackState, Event.PlaybackActiveTrackChanged],
    async (event) => {
      if (partyMode !== 'host' || connectionState !== 'connected') return;

      if (event.type === Event.PlaybackState) {
        const stateObj = event as { state: State };
        const state = stateObj.state;

        if (state === lastStateRef.current) return;
        lastStateRef.current = state;

        const currentTrack = await TrackPlayer.getActiveTrack();
        const position = await TrackPlayer.getPosition();

        if (state === State.Playing && currentTrack) {
          PartyManager.broadcast({
            type: 'PLAY',
            track: currentTrack,
            position,
            playAt: Date.now() + 500, // Schedule play 500ms in future
          });
        } else if (state === State.Paused && currentTrack) {
          PartyManager.broadcast({
            type: 'PAUSE',
            track: currentTrack,
            position,
          });
        }
      }

      if (event.type === Event.PlaybackActiveTrackChanged) {
        const trackEvent = event as { track: any };
        const activeTrack = trackEvent.track;

        if (!activeTrack || activeTrack.id === lastTrackIdRef.current) return;
        lastTrackIdRef.current = activeTrack.id;

        const queue = await TrackPlayer.getQueue();
        
        // Broadcast queue update & auto play
        PartyManager.broadcast({
          type: 'QUEUE_UPDATE',
          tracks: queue,
        });

        PartyManager.broadcast({
          type: 'PLAY',
          track: activeTrack,
          position: 0,
          playAt: Date.now() + 500,
        });
      }
    }
  );

  // 2. Client Mode: Listen for host commands from PartyManager
  useEffect(() => {
    if (partyMode !== 'client' || connectionState !== 'connected') return;

    const subscription = DeviceEventEmitter.addListener('party_cmd', async (msg) => {
      console.log('[PartyPlayerSync] Received host command:', msg.type);

      try {
        switch (msg.type) {
          case 'QUEUE_UPDATE': {
            const currentQueue = await TrackPlayer.getQueue();
            
            // Check if queue is different (simple length comparison or id mapping)
            const isDifferent = currentQueue.length !== msg.tracks.length || 
              currentQueue.some((track, idx) => track.id !== msg.tracks[idx]?.id);

            if (isDifferent) {
              await TrackPlayer.reset();
              // Replace urls for local files if we need to fetch them
              const cleanTracks = msg.tracks.map((track: any) => ({
                ...track,
                // Keep original url in metadata for reference if needed
                originalUrl: track.url,
              }));
              await TrackPlayer.add(cleanTracks);
              console.log('[PartyPlayerSync] Queue updated from Host');
            }
            break;
          }

          case 'PLAY': {
            const currentPartyTime = PartyManager.getPartyTime();
            const delay = msg.playAt - currentPartyTime;
            
            let trackIndex = -1;
            const queue = await TrackPlayer.getQueue();
            trackIndex = queue.findIndex((t) => t.id === msg.track.id);

            let resolvedUrl = msg.track.url;

            // If track doesn't exist in queue, add it
            if (trackIndex === -1) {
              // If it's a local file on host, fetch it over TCP first
              if (typeof resolvedUrl === 'string' && resolvedUrl.startsWith('file:///')) {
                // Find IP address from active connection
                const hostIp = PartyManager.getPartyTime() ? msg.track.streamHost || '127.0.0.1' : '127.0.0.1';
                try {
                  const localCachedPath = await PartyManager.downloadTrackFromHost(hostIp, msg.track.id);
                  resolvedUrl = localCachedPath;
                } catch (e) {
                  console.error('[PartyPlayerSync] Offline file download failed:', e);
                }
              }

              const cleanTrack = { ...msg.track, url: resolvedUrl };
              await TrackPlayer.add([cleanTrack]);
              trackIndex = (await TrackPlayer.getQueue()).length - 1;
            } else {
              // Track exists, check if we need to download local file
              const localTrack = queue[trackIndex];
              if (typeof localTrack.url === 'string' && localTrack.url.startsWith('file:///')) {
                // Check if file physically exists. If not, download from host.
                const pathClean = localTrack.url.replace('file://', '');
                const exists = await ReactNativeBlobUtil.fs.exists(pathClean);
                if (!exists) {
                  const hostIp = msg.track.streamHost || '127.0.0.1';
                  try {
                    const localCachedPath = await PartyManager.downloadTrackFromHost(hostIp, msg.track.id);
                    localTrack.url = localCachedPath;
                    
                    // Re-add/update track in player queue
                    const currentQueue = await TrackPlayer.getQueue();
                    await TrackPlayer.reset();
                    currentQueue[trackIndex] = localTrack;
                    await TrackPlayer.add(currentQueue);
                  } catch (e) {
                    console.error('[PartyPlayerSync] Offline re-download failed:', e);
                  }
                }
              }
            }

            // Sync track index
            const currentIndex = await TrackPlayer.getActiveTrackIndex();
            if (currentIndex !== trackIndex) {
              await TrackPlayer.skip(trackIndex);
            }

            // Apply delay-aware play
            if (delay > 0) {
              await TrackPlayer.seekTo(msg.position);
              setTimeout(async () => {
                const state = await TrackPlayer.getPlaybackState();
                if (state.state !== State.Playing) {
                  await TrackPlayer.play();
                }
              }, delay);
            } else {
              // Message was delayed or client joined late
              const seekPos = msg.position + (Math.abs(delay) / 1000);
              await TrackPlayer.seekTo(seekPos);
              await TrackPlayer.play();
            }
            break;
          }

          case 'PAUSE': {
            await TrackPlayer.pause();
            if (msg.position !== undefined) {
              await TrackPlayer.seekTo(msg.position);
            }
            break;
          }

          case 'SEEK': {
            const currentPartyTime = PartyManager.getPartyTime();
            const delay = msg.playAt - currentPartyTime;
            const targetPos = msg.position + (delay > 0 ? 0 : Math.abs(delay) / 1000);
            
            await TrackPlayer.seekTo(targetPos);
            break;
          }

          case 'SET_VOLUME': {
            if (msg.volume !== undefined) {
              console.log('[PartyPlayerSync] Setting relative volume:', msg.volume);
              await TrackPlayer.setVolume(msg.volume);
            }
            break;
          }

          default:
            break;
        }
      } catch (e) {
        console.error('[PartyPlayerSync] Failed to apply host command:', e);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [partyMode, connectionState, clockOffset]);
}
