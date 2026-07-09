import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import TrackPlayer, { Event, useTrackPlayerEvents, PlaybackState, State } from 'react-native-track-player';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { usePartyStore } from '@/services/party/partyStore';
import { PartyManager } from '@/services/party/PartyManager';

export function usePartyPlayerSync() {
  const { partyMode, connectionState, discoveredHosts, clockOffset } = usePartyStore();
  
  // Ref to hold the latest partyMode and connectionState to avoid stale closures in useTrackPlayerEvents
  const statusRef = useRef({ partyMode, connectionState });
  statusRef.current = { partyMode, connectionState };
  
  // Track previous playback state to avoid redundant broadcast loops
  const lastStateRef = useRef<State | string>('');
  const lastTrackIdRef = useRef<string>('');

  // Ref to hold the sync play target for client post-buffering synchronization
  const lastPlaySyncTargetRef = useRef<{ playAt: number; position: number; trackId: string } | null>(null);

  // 1. Host Mode: Monitor local player actions and broadcast
  useTrackPlayerEvents(
    [Event.PlaybackState, Event.PlaybackActiveTrackChanged],
    async (event) => {
      const { partyMode: activeMode, connectionState: activeConn } = statusRef.current;
      if (activeMode !== 'host' || activeConn !== 'connected') return;

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
            playAt: Date.now(), // Broadcast exact current time of event
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
          playAt: Date.now(), // Broadcast exact current time of event
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

            // Save sync target details for post-buffering alignment
            lastPlaySyncTargetRef.current = {
              playAt: msg.playAt,
              position: msg.position,
              trackId: msg.track.id,
            };

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

  // 3. Client Mode: Monitor local player state for post-buffering resync
  useTrackPlayerEvents([Event.PlaybackState], async (event) => {
    const { partyMode: activeMode, connectionState: activeConn } = statusRef.current;
    if (activeMode !== 'client' || activeConn !== 'connected') return;

    if (event.type === Event.PlaybackState) {
      const stateObj = event as { state: State };
      const state = stateObj.state;
      console.log(`[PartyPlayerSync] Client state changed to: ${state}`);

      if (state === State.Playing) {
        if (!lastPlaySyncTargetRef.current) {
          console.log('[PartyPlayerSync] Client playing, but lastPlaySyncTarget is null');
          return;
        }

        const { playAt, position, trackId } = lastPlaySyncTargetRef.current;
        const currentTrack = await TrackPlayer.getActiveTrack();
        if (currentTrack && currentTrack.id === trackId) {
          const currentPartyTime = PartyManager.getPartyTime();
          const expectedPosition = position + (currentPartyTime - playAt) / 1000;
          const currentPosition = await TrackPlayer.getPosition();
          const diff = Math.abs(currentPosition - expectedPosition);

          console.log(`[PartyPlayerSync] Sync calculation - client pos: ${currentPosition.toFixed(2)}, expected host pos: ${expectedPosition.toFixed(2)}, diff: ${(diff * 1000).toFixed(0)}ms (threshold: 150ms)`);

          if (diff > 0.15) { // If offset is larger than 150ms
            console.log(`[PartyPlayerSync] Post-buffering resync: seeking from ${currentPosition.toFixed(2)} to ${expectedPosition.toFixed(2)}`);
            await TrackPlayer.seekTo(expectedPosition);
          } else {
            console.log('[PartyPlayerSync] Client is in-sync. Skipping seek.');
          }
        } else {
          console.log(`[PartyPlayerSync] Client playing, but active track ID mismatch. Active: ${currentTrack?.id}, Expected: ${trackId}`);
        }
      }
    }
  });
}
