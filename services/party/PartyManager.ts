import TcpSocket from 'react-native-tcp-socket';
import { Buffer } from 'buffer';
import NsdModule, { addNsdListener, NsdService } from '@/modules/nsd';
import { usePartyStore, PartyClient } from './partyStore';
import TrackPlayer from 'react-native-track-player';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { getLocalDownloadUri, getActiveDirectory } from '@/services/downloads/storage';
import { DeviceEventEmitter } from 'react-native';

const CONTROL_PORT = 5000;
const FILE_PORT = 5001;

class PartyManagerClass {
  private server: any = null;
  private fileServer: any = null;
  private clientSocket: any = null;
  private clientSockets: Map<string, any> = new Map();
  private nsdListeners: any[] = [];
  private timeSyncCallbacks: Map<number, (res: { t2: number; t3: number }) => void> = new Map();
  private bufferMap: Map<any, string> = new Map();
  private ntpSyncCounter = 0;

  // Initialize discovery listener for NSD
  public startDiscovery() {
    this.stopDiscovery();
    
    const store = usePartyStore.getState();
    store.setDiscoveredHosts([]);

    const resolvedListener = addNsdListener('onServiceResolved', (service: NsdService) => {
      console.log('[PartyManager] Service resolved:', service);
      store.addDiscoveredHost(service);
    });

    const lostListener = addNsdListener('onServiceLost', (event) => {
      console.log('[PartyManager] Service lost:', event.serviceName);
      store.removeDiscoveredHost(event.serviceName);
    });

    this.nsdListeners.push(resolvedListener, lostListener);

    NsdModule.startDiscovery('_musicparty._tcp')
      .then(() => console.log('[PartyManager] NSD Discovery started'))
      .catch((err: any) => console.error('[PartyManager] Failed to start NSD discovery:', err));
  }

  public stopDiscovery() {
    NsdModule.stopDiscovery().catch(() => {});
    this.nsdListeners.forEach((l) => l.remove());
    this.nsdListeners = [];
  }

  // --- HOST OPERATIONS ---

  public async startHosting(partyName: string) {
    this.stopAll();
    const store = usePartyStore.getState();
    store.reset();
    store.setPartyMode('host');
    store.setPartyName(partyName);
    store.setConnectionState('connected');

    try {
      // 1. Start TCP Control Server
      this.server = TcpSocket.createServer((socket) => {
        const clientIp = socket.remoteAddress || '';
        const clientPort = socket.remotePort || 0;
        const clientId = `${clientIp}:${clientPort}`;

        console.log('[PartyManager] Client connected to Control Server:', clientId);

        socket.on('data', (data) => {
          this.handleSocketStream(socket, data, (msg) => {
            this.handleHostMessage(clientId, socket, msg);
          });
        });

        socket.on('close', () => {
          console.log('[PartyManager] Client disconnected:', clientId);
          this.clientSockets.delete(clientId);
          this.bufferMap.delete(socket);
          
          const clients = store.connectedClients.filter(c => c.id !== clientId);
          store.setConnectedClients(clients);
        });

        socket.on('error', (err) => {
          console.error('[PartyManager] Host socket client error:', err);
        });
      });

      this.server.listen({ port: CONTROL_PORT, host: '0.0.0.0' }, () => {
        console.log('[PartyManager] Control TCP Server listening on port', CONTROL_PORT);
      });

      // 2. Start File Server
      this.startFileServer();

      // 3. Register NSD Service
      await NsdModule.registerService(partyName, CONTROL_PORT);
      console.log('[PartyManager] NSD Service registered:', partyName);

    } catch (e) {
      console.error('[PartyManager] Failed to start hosting:', e);
      this.stopHosting();
    }
  }

  public stopHosting() {
    const store = usePartyStore.getState();
    
    // Unregister NSD service
    NsdModule.unregisterService().catch(() => {});

    // Close all connected clients
    this.clientSockets.forEach((socket) => {
      try { socket.destroy(); } catch (_) {}
    });
    this.clientSockets.clear();

    // Close control server
    if (this.server) {
      try { this.server.close(); } catch (_) {}
      this.server = null;
    }

    // Close file server
    if (this.fileServer) {
      try { this.fileServer.close(); } catch (_) {}
      this.fileServer = null;
    }

    this.bufferMap.clear();
    store.reset();
  }

  private startFileServer() {
    this.fileServer = TcpSocket.createServer((socket) => {
      let fileBuffer = '';
      
      socket.on('data', (data) => {
        fileBuffer += data.toString('utf8');
        const newlineIndex = fileBuffer.indexOf('\n');
        if (newlineIndex !== -1) {
          const trackId = fileBuffer.substring(0, newlineIndex).trim();
          console.log('[PartyManager] File server requested track:', trackId);
          this.serveFileToSocket(socket, trackId);
        }
      });

      socket.on('error', (err) => {
        console.error('[PartyManager] File server socket error:', err);
      });
    });

    this.fileServer.listen({ port: FILE_PORT, host: '0.0.0.0' }, () => {
      console.log('[PartyManager] File TCP Server listening on port', FILE_PORT);
    });
  }

  private async serveFileToSocket(socket: any, trackId: string) {
    try {
      const localUri = await getLocalDownloadUri(trackId);
      if (!localUri) {
        console.warn(`[PartyManager] Track ${trackId} not found locally to serve.`);
        socket.write('ERROR: NOT_FOUND\n');
        socket.end();
        return;
      }

      const filePath = localUri.replace('file://', '');
      const fileExists = await ReactNativeBlobUtil.fs.exists(filePath);
      if (!fileExists) {
        console.warn(`[PartyManager] Track file path ${filePath} does not exist.`);
        socket.write('ERROR: FILE_MISSING\n');
        socket.end();
        return;
      }

      console.log(`[PartyManager] Streaming track ${trackId} from ${filePath}...`);
      ReactNativeBlobUtil.fs.readStream(filePath, 'base64', 16384)
        .then((stream) => {
          stream.open();
          
          stream.onData((chunk) => {
            if (socket.writable) {
              socket.write(chunk, 'base64');
            }
          });

          stream.onEnd(() => {
            socket.end();
          });

          stream.onError((err) => {
            console.error('[PartyManager] Error streaming file:', err);
            socket.end();
          });
        })
        .catch((err) => {
          console.error('[PartyManager] Stream creation failed:', err);
          socket.end();
        });

    } catch (e) {
      console.error('[PartyManager] Failed to serve file:', e);
      socket.end();
    }
  }

  public broadcast(msg: any) {
    if (usePartyStore.getState().partyMode !== 'host') return;
    const dataStr = JSON.stringify(msg) + '\n';
    this.clientSockets.forEach((socket) => {
      if (socket.writable) {
        socket.write(dataStr);
      }
    });
  }

  public sendToClient(clientId: string, msg: any) {
    const socket = this.clientSockets.get(clientId);
    if (socket && socket.writable) {
      socket.write(JSON.stringify(msg) + '\n');
    }
  }

  // --- CLIENT OPERATIONS ---

  public connectToParty(hostIp: string, hostPort: number) {
    this.stopAll();
    const store = usePartyStore.getState();
    store.reset();
    store.setPartyMode('client');
    store.setConnectionState('connecting');

    console.log(`[PartyManager] Connecting to host at ${hostIp}:${hostPort}`);

    this.clientSocket = TcpSocket.createConnection({
      host: hostIp,
      port: hostPort,
    }, () => {
      console.log('[PartyManager] Connected to Host control server');
      store.setConnectionState('connected');

      // Calibrate clock offset via NTP
      this.syncClock()
        .then((offset) => {
          console.log('[PartyManager] Synced clock offset:', offset);
          store.setClockOffset(offset);

          // Join the party with device information
          const joinMsg = {
            type: 'JOIN',
            id: DeviceEventEmitter ? 'client_' + Math.random().toString(36).substr(2, 9) : 'client_device',
            name: 'Device ' + Math.floor(Math.random() * 1000),
          };
          this.sendToHost(joinMsg);
        })
        .catch((err) => {
          console.error('[PartyManager] Clock synchronization failed:', err);
          // Join anyway with 0 offset if sync fails
          const joinMsg = {
            type: 'JOIN',
            id: 'client_' + Math.random().toString(36).substr(2, 9),
            name: 'Device ' + Math.floor(Math.random() * 1000),
          };
          this.sendToHost(joinMsg);
        });
    });

    this.clientSocket.on('data', (data: Buffer) => {
      this.handleSocketStream(this.clientSocket, data, (msg) => {
        this.handleClientMessage(msg);
      });
    });

    this.clientSocket.on('close', () => {
      console.log('[PartyManager] Connection to host closed');
      store.setConnectionState('disconnected');
      this.bufferMap.delete(this.clientSocket);
    });

    this.clientSocket.on('error', (err: any) => {
      console.error('[PartyManager] Client socket error:', err);
      store.setConnectionState('disconnected');
    });
  }

  public disconnectFromParty() {
    if (this.clientSocket) {
      try { this.clientSocket.destroy(); } catch (_) {}
      this.clientSocket = null;
    }
    usePartyStore.getState().reset();
  }

  public sendToHost(msg: any) {
    if (this.clientSocket && this.clientSocket.writable) {
      this.clientSocket.write(JSON.stringify(msg) + '\n');
    }
  }

  // --- NTP CLOCK SYNC ---

  private syncClock(): Promise<number> {
    return new Promise(async (resolve, reject) => {
      const offsets: number[] = [];
      const samples = 5;

      for (let i = 0; i < samples; i++) {
        try {
          const offset = await this.pingNtpSample();
          offsets.push(offset);
          await new Promise(r => setTimeout(r, 150));
        } catch (e) {
          console.warn('[PartyManager] NTP sample ping failed:', e);
        }
      }

      if (offsets.length === 0) {
        reject(new Error('NTP sync samples failed entirely'));
        return;
      }

      // Median offset calculation
      offsets.sort((a, b) => a - b);
      const median = offsets[Math.floor(offsets.length / 2)];
      resolve(median);
    });
  }

  private pingNtpSample(): Promise<number> {
    return new Promise((resolve, reject) => {
      const t1 = Date.now();
      const requestId = ++this.ntpSyncCounter;

      const timeout = setTimeout(() => {
        this.timeSyncCallbacks.delete(requestId);
        reject(new Error('NTP Sync Timeout'));
      }, 3000);

      this.timeSyncCallbacks.set(requestId, ({ t2, t3 }) => {
        clearTimeout(timeout);
        const t4 = Date.now();
        
        // NTP Offset Formula: ((t2 - t1) + (t3 - t4)) / 2
        const offset = ((t2 - t1) + (t3 - t4)) / 2;
        resolve(offset);
      });

      this.sendToHost({
        type: 'TIME_SYNC_REQUEST',
        id: requestId,
        t1,
      });
    });
  }

  // --- OFFLINE FILE REQUEST (CLIENT) ---

  public downloadTrackFromHost(hostIp: string, trackId: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const activeDir = await getActiveDirectory();
        const localFileName = `party_${trackId}.mp3`;
        const tempPath = `${activeDir}/${localFileName}`;
        const cleanPath = tempPath.replace('file://', '');

        // If file already exists, reuse it
        const fileExists = await ReactNativeBlobUtil.fs.exists(cleanPath);
        if (fileExists) {
          resolve(tempPath);
          return;
        }

        console.log(`[PartyManager] Connecting to Host file server at ${hostIp}:${FILE_PORT} for track ${trackId}`);
        const fileSocket = TcpSocket.createConnection({
          host: hostIp,
          port: FILE_PORT,
        }, async () => {
          console.log('[PartyManager] File server connection established. Requesting file...');
          fileSocket.write(trackId + '\n');
        });

        const stream = await ReactNativeBlobUtil.fs.writeStream(cleanPath, 'base64', false);

        fileSocket.on('data', (chunk: any) => {
          const base64Data = Buffer.isBuffer(chunk) ? chunk.toString('base64') : Buffer.from(chunk).toString('base64');
          stream.write(base64Data);
        });

        fileSocket.on('close', async () => {
          await stream.close();
          console.log('[PartyManager] File transfer completed:', tempPath);
          resolve(tempPath);
        });

        fileSocket.on('error', async (err: any) => {
          await stream.close();
          // Delete temp file if errored
          try { await ReactNativeBlobUtil.fs.unlink(cleanPath); } catch (_) {}
          reject(err);
        });

      } catch (e) {
        reject(e);
      }
    });
  }

  // --- STREAM & MESSAGE HANDLERS ---

  private handleSocketStream(socket: any, data: any, callback: (msg: any) => void) {
    let currentBuffer = this.bufferMap.get(socket) || '';
    currentBuffer += data.toString('utf8');

    let boundary = currentBuffer.indexOf('\n');
    while (boundary !== -1) {
      const line = currentBuffer.substring(0, boundary).trim();
      currentBuffer = currentBuffer.substring(boundary + 1);
      
      if (line) {
        try {
          const msg = JSON.parse(line);
          callback(msg);
        } catch (e) {
          console.error('[PartyManager] Failed to parse JSON message:', line, e);
        }
      }
      boundary = currentBuffer.indexOf('\n');
    }
    this.bufferMap.set(socket, currentBuffer);
  }

  private handleHostMessage(clientId: string, socket: any, msg: any) {
    const store = usePartyStore.getState();
    const serverReceived = Date.now();

    switch (msg.type) {
      case 'TIME_SYNC_REQUEST':
        const serverSent = Date.now();
        socket.write(JSON.stringify({
          type: 'TIME_SYNC_RESPONSE',
          id: msg.id,
          t1: msg.t1,
          t2: serverReceived,
          t3: serverSent,
        }) + '\n');
        break;

      case 'JOIN':
        console.log('[PartyManager] Client registered:', msg.name);
        this.clientSockets.set(clientId, socket);

        const newClient: PartyClient = {
          id: clientId,
          name: msg.name,
          x: 0.2 + Math.random() * 0.6,
          y: 0.2 + Math.random() * 0.6,
          ip: socket.remoteAddress || '',
          port: socket.remotePort || 0,
          volume: 1.0,
        };

        const updatedClients = [...store.connectedClients, newClient];
        store.setConnectedClients(updatedClients);

        // Share current playback state and queue to the joined client
        this.syncStateToClient(clientId);
        break;

      default:
        console.log('[PartyManager] Host received unhandled message:', msg.type);
    }
  }

  private handleClientMessage(msg: any) {
    const store = usePartyStore.getState();

    switch (msg.type) {
      case 'TIME_SYNC_RESPONSE':
        const callback = this.timeSyncCallbacks.get(msg.id);
        if (callback) {
          callback({ t2: msg.t2, t3: msg.t3 });
          this.timeSyncCallbacks.delete(msg.id);
        }
        break;

      case 'PLAY':
      case 'PAUSE':
      case 'SEEK':
      case 'QUEUE_UPDATE':
      case 'SET_VOLUME':
        // Emit events so that the TrackPlayer Sync Bridge hook can capture them
        DeviceEventEmitter.emit('party_cmd', msg);
        break;

      default:
        console.log('[PartyManager] Client received unhandled message:', msg.type);
    }
  }

  private async syncStateToClient(clientId: string) {
    try {
      const queue = await TrackPlayer.getQueue();
      const currentTrackIndex = await TrackPlayer.getActiveTrackIndex();
      
      this.sendToClient(clientId, {
        type: 'QUEUE_UPDATE',
        tracks: queue,
      });

      if (currentTrackIndex !== undefined) {
        const track = queue[currentTrackIndex];
        const stateObj = await TrackPlayer.getPlaybackState();
        const isPlaying = stateObj.state === 'playing';
        const position = await TrackPlayer.getPosition();

        if (isPlaying && track) {
          this.sendToClient(clientId, {
            type: 'PLAY',
            track,
            position,
            playAt: Date.now() + 600, // Schedule slightly in future for new client
          });
        } else if (track) {
          this.sendToClient(clientId, {
            type: 'PAUSE',
            track,
            position,
          });
        }
      }
    } catch (e) {
      console.error('[PartyManager] Failed to sync state to client:', e);
    }
  }

  // --- HELPER UTILS ---

  private stopAll() {
    this.stopDiscovery();
    this.stopHosting();
    this.disconnectFromParty();
  }

  public getPartyTime(): number {
    const store = usePartyStore.getState();
    return Date.now() + store.clockOffset;
  }
}

export const PartyManager = new PartyManagerClass();
