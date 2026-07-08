import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Animated,
  PanResponder,
  GestureResponderEvent,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import {
  Users,
  Radio,
  Music,
  Wifi,
  WifiOff,
  Smartphone,
  Volume2,
  Compass,
  Play,
  Pause,
  ChevronRight,
  Activity,
  Check,
} from 'lucide-react-native';

import { ThemedView } from '@/components/themed-view';
import { BunnyCard } from '@/components/ui/bunny-card';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Typography, Muted } from '@/components/ui/typography';
import { useAppTheme } from '@/contexts/app-theme-context';
import { addAlpha } from '@/constants/theme';
import { usePartyStore, PartyClient } from '@/services/party/partyStore';
import { PartyManager } from '@/services/party/PartyManager';
import { usePartyPlayerSync } from '@/services/party/usePartyPlayerSync';

const GRID_SIZE = 280;
const NODE_SIZE = 40;

export default function PartyScreen() {
  const { colors } = useAppTheme();
  usePartyPlayerSync(); // Bind the TrackPlayer event sync to this screen session

  const {
    partyMode,
    connectionState,
    discoveredHosts,
    connectedClients,
    listenerPosition,
    clockOffset,
    partyName,
    setListenerPosition,
    updateClientPosition,
  } = usePartyStore();

  const [activeTab, setActiveTab] = useState<'host' | 'join'>('host');
  const [hostNameInput, setHostNameInput] = useState('Bunny Music Party');
  const [manualIp, setManualIp] = useState('');
  const [manualPort, setManualPort] = useState('5000');
  const [scanning, setScanning] = useState(false);

  // Radar animation
  const radarAnim = useRef(new Animated.Value(0)).current;

  // Track dragging active state
  const [draggingClientId, setDraggingClientId] = useState<string | null>(null);

  // Throttle utility to prevent network spam during drag
  const lastSendTimeRef = useRef<number>(0);

  useEffect(() => {
    if (scanning) {
      radarAnim.setValue(0);
      Animated.loop(
        Animated.timing(radarAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      radarAnim.setValue(0);
      radarAnim.stopAnimation();
    }
  }, [scanning]);

  // Handle Client coordinate changes and calculate volume
  const handleDrag = (clientId: string, pageX: number, pageY: number, gridLayout: { x: number, y: number }) => {
    // Calculate touch position relative to the grid canvas
    let relativeX = (pageX - gridLayout.x) / GRID_SIZE;
    let relativeY = (pageY - gridLayout.y) / GRID_SIZE;

    // Clamp coordinates inside [0, 1]
    relativeX = Math.max(0, Math.min(1, relativeX));
    relativeY = Math.max(0, Math.min(1, relativeY));

    // Update coordinates in store
    updateClientPosition(clientId, relativeX, relativeY);

    // Calculate volume: scale based on distance from center (listener)
    const dx = relativeX - 0.5;
    const dy = relativeY - 0.5;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // Maximum distance from center to edge is sqrt(0.5^2 + 0.5^2) = 0.707
    const maxDist = 0.707;
    const rawVolume = 1 - (distance / maxDist);
    // Clamp volume between 0.05 (silent edge) and 1.0 (center sweet spot)
    const volume = Math.max(0.05, Math.min(1.0, rawVolume));

    // Send volume update to client with throttling (max once per 80ms)
    const now = Date.now();
    if (now - lastSendTimeRef.current > 80) {
      PartyManager.sendToClient(clientId, {
        type: 'SET_VOLUME',
        volume,
      });
      lastSendTimeRef.current = now;
    }
  };

  const handleStartHosting = async () => {
    if (!hostNameInput.trim()) return;
    await PartyManager.startHosting(hostNameInput.trim());
  };

  const handleStopHosting = () => {
    PartyManager.stopHosting();
  };

  const handleStartScanning = () => {
    setScanning(true);
    PartyManager.startDiscovery();
  };

  const handleStopScanning = () => {
    setScanning(false);
    PartyManager.stopDiscovery();
  };

  const handleConnect = (ip: string, port: number) => {
    PartyManager.connectToParty(ip, port);
  };

  const handleDisconnect = () => {
    PartyManager.disconnectFromParty();
  };

  const handleManualConnect = () => {
    if (!manualIp.trim() || !manualPort.trim()) return;
    PartyManager.connectToParty(manualIp.trim(), parseInt(manualPort.trim(), 10));
  };

  // State to track physical canvas coordinates for touch dragging
  const [gridLayout, setGridLayout] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<View>(null);

  const measureGrid = () => {
    if (gridRef.current) {
      gridRef.current.measure((x, y, width, height, pageX, pageY) => {
        setGridLayout({ x: pageX, y: pageY });
      });
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <Stack.Screen options={{ title: 'Music Party' }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        scrollEnabled={draggingClientId === null} // Lock scroll when dragging nodes
      >
        <Text style={[styles.floatingTitle, { color: colors.text }]}>Music Party Beta</Text>
        <Muted style={styles.subtitle}>
          Synchronize music playback across multiple Android devices on local Wi-Fi.
        </Muted>

        {/* Tab Selection */}
        {partyMode === 'idle' && (
          <SegmentedControl
            options={[
              { value: 'host', label: 'Host Party' },
              { value: 'join', label: 'Join Party' },
            ]}
            selectedValue={activeTab}
            onChange={(val) => setActiveTab(val as 'host' | 'join')}
          />
        )}

        {/* HOST TAB CONTENT */}
        {partyMode === 'idle' && activeTab === 'host' && (
          <BunnyCard style={styles.card}>
            <Typography variant="h3" style={styles.cardTitle}>Host a Music Party</Typography>
            <Muted style={{ marginBottom: 16 }}>
              Other devices on your local Wi-Fi or hotspot will be able to discover and connect to you.
            </Muted>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Party Name</Text>
            <TextInput
              value={hostNameInput}
              onChangeText={setHostNameInput}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: addAlpha(colors.background, 0.5),
                },
              ]}
              placeholder="e.g. My Awesome Party"
              placeholderTextColor={colors.mutedForeground}
            />

            <Button
              onPress={handleStartHosting}
              style={[styles.actionButton]}
            >
              <Text style={styles.buttonText}>Start Hosting</Text>
            </Button>
          </BunnyCard>
        )}

        {/* JOIN TAB CONTENT */}
        {partyMode === 'idle' && activeTab === 'join' && (
          <View style={{ gap: 12 }}>
            <BunnyCard style={styles.card}>
              <View style={styles.headerRow}>
                <Typography variant="h3">Join a Music Party</Typography>
                {scanning && <ActivityIndicator color={colors.primary} size="small" />}
              </View>
              <Muted style={{ marginBottom: 16 }}>
                Scan for hosted music parties on your local Wi-Fi network.
              </Muted>

              {scanning ? (
                <View style={styles.scanningContainer}>
                  {/* Pulsing radar lines */}
                  <Animated.View
                    style={[
                      styles.radarCircle,
                      {
                        borderColor: colors.primary,
                        opacity: radarAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0.8, 0.4, 0],
                        }),
                        transform: [
                          {
                            scale: radarAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.5, 2.5],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.radarCircle,
                      {
                        borderColor: colors.primary,
                        opacity: radarAnim.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [0, 0.8, 0],
                        }),
                        transform: [
                          {
                            scale: radarAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.2, 2.0],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <Compass size={40} color={colors.primary} />
                  <Typography variant="muted" style={{ marginTop: 12 }}>
                    Scanning network for parties...
                  </Typography>

                  <Button
                    variant="secondary"
                    onPress={handleStopScanning}
                    style={[styles.actionButton, { marginTop: 16 }]}
                  >
                    <Text style={{ color: colors.text }}>Stop Scanning</Text>
                  </Button>
                </View>
              ) : (
                <Button
                  onPress={handleStartScanning}
                  style={[styles.actionButton]}
                >
                  <Text style={styles.buttonText}>Scan for Parties</Text>
                </Button>
              )}
            </BunnyCard>

            {/* Discovered Hosts List */}
            {scanning && (
              <BunnyCard style={styles.card}>
                <Typography variant="large" style={{ marginBottom: 8 }}>Discovered Hosts</Typography>
                {discoveredHosts.length === 0 ? (
                  <Muted>No hosts found yet. Make sure the host is on the same network.</Muted>
                ) : (
                  <View style={{ gap: 8 }}>
                    {discoveredHosts.map((host) => (
                      <Pressable
                        key={host.serviceName}
                        onPress={() => handleConnect(host.ip, host.port)}
                        style={({ pressed }) => [
                          styles.hostRow,
                          {
                            borderColor: colors.border,
                            backgroundColor: pressed
                              ? addAlpha(colors.primary, 0.15)
                              : addAlpha(colors.border, 0.2),
                          },
                        ]}
                      >
                        <View style={styles.hostInfo}>
                          <Radio size={20} color={colors.primary} />
                          <View>
                            <Typography variant="large">{host.serviceName}</Typography>
                            <Muted>{host.ip}:{host.port}</Muted>
                          </View>
                        </View>
                        <ChevronRight size={20} color={colors.mutedForeground} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </BunnyCard>
            )}

            {/* Manual Connection Option */}
            <BunnyCard style={styles.card}>
              <Typography variant="large" style={{ marginBottom: 8 }}>Manual Connect</Typography>
              <Muted style={{ marginBottom: 12 }}>Connect directly by entering the host's IP address.</Muted>
              <View style={styles.manualInputRow}>
                <TextInput
                  value={manualIp}
                  onChangeText={setManualIp}
                  placeholder="Host IP (e.g. 192.168.1.5)"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.manualInput,
                    { color: colors.text, borderColor: colors.border, flex: 2 },
                  ]}
                />
                <TextInput
                  value={manualPort}
                  onChangeText={setManualPort}
                  placeholder="Port"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                  style={[
                    styles.manualInput,
                    { color: colors.text, borderColor: colors.border, flex: 1 },
                  ]}
                />
              </View>
              <Button
                variant="secondary"
                onPress={handleManualConnect}
                style={[styles.actionButton, { marginTop: 12 }]}
              >
                <Text style={{ color: colors.text }}>Connect Manually</Text>
              </Button>
            </BunnyCard>
          </View>
        )}

        {/* HOST LIVE VIEW (Spatial Audio Grid) */}
        {partyMode === 'host' && (
          <View style={{ gap: 12 }}>
            <BunnyCard style={styles.card}>
              <View style={styles.headerRow}>
                <View>
                  <Typography variant="h3">{partyName}</Typography>
                  <Muted>Status: Hosting Party</Muted>
                </View>
                <Button variant="destructive" onPress={handleStopHosting}>
                  <Text style={{ color: '#FFFFFF' }}>Stop Party</Text>
                </Button>
              </View>
            </BunnyCard>

            <BunnyCard style={styles.card}>
              <Typography variant="large" style={{ marginBottom: 4 }}>Spatial Audio Control</Typography>
              <Muted style={{ marginBottom: 16 }}>
                Arrange devices on the grid below. Move them closer to the center (sweet spot) to increase their volume, or drag them away to fade them out.
              </Muted>

              {/* Spatial audio grid canvas */}
              <View style={styles.canvasWrapper}>
                <View
                  ref={gridRef}
                  onLayout={measureGrid}
                  style={[
                    styles.gridCanvas,
                    {
                      borderColor: colors.border,
                      backgroundColor: addAlpha(colors.border, 0.2),
                    },
                  ]}
                  onTouchMove={(e) => {
                    if (draggingClientId && gridLayout) {
                      handleDrag(draggingClientId, e.nativeEvent.pageX, e.nativeEvent.pageY, gridLayout);
                    }
                  }}
                  onTouchEnd={() => {
                    setDraggingClientId(null);
                  }}
                >
                  {/* Center sweet spot */}
                  <View style={[styles.sweetSpot, { backgroundColor: addAlpha(colors.primary, 0.2), borderColor: colors.primary }]}>
                    <Music size={20} color={colors.primary} />
                  </View>

                  {/* Connected client nodes */}
                  {connectedClients.map((client) => {
                    const clientX = client.x * GRID_SIZE - NODE_SIZE / 2;
                    const clientY = client.y * GRID_SIZE - NODE_SIZE / 2;
                    
                    // Volume percentage calculation
                    const dx = client.x - 0.5;
                    const dy = client.y - 0.5;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const volPercent = Math.max(5, Math.round((1 - (distance / 0.707)) * 100));

                    return (
                      <View
                        key={client.id}
                        style={[
                          styles.clientNodeWrapper,
                          {
                            transform: [
                              { translateX: clientX },
                              { translateY: clientY },
                            ],
                          },
                        ]}
                      >
                        <Pressable
                          onTouchStart={() => {
                            measureGrid();
                            setDraggingClientId(client.id);
                          }}
                          style={[
                            styles.clientNode,
                            {
                              backgroundColor: colors.primary,
                              shadowColor: colors.primary,
                            },
                            draggingClientId === client.id && styles.activeDragNode,
                          ]}
                        >
                          <Smartphone size={18} color="#FFFFFF" />
                        </Pressable>
                        <Text style={[styles.nodeLabel, { color: colors.text }]} numberOfLines={1}>
                          {client.name} ({volPercent}%)
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </BunnyCard>

            {/* Connected client list details */}
            <BunnyCard style={styles.card}>
              <Typography variant="large" style={{ marginBottom: 8 }}>Connected Clients ({connectedClients.length})</Typography>
              {connectedClients.length === 0 ? (
                <Muted>Waiting for devices to join. Tell clients to scan for "{partyName}"</Muted>
              ) : (
                <View style={{ gap: 8 }}>
                  {connectedClients.map((client) => {
                    const dx = client.x - 0.5;
                    const dy = client.y - 0.5;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const volPercent = Math.max(5, Math.round((1 - (dist / 0.707)) * 100));

                    return (
                      <View key={client.id} style={[styles.clientDetailRow, { borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Smartphone size={20} color={colors.text} />
                          <View>
                            <Typography variant="large">{client.name}</Typography>
                            <Muted>{client.id}</Muted>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Volume2 size={16} color={colors.primary} />
                          <Typography style={{ color: colors.primary }}>{volPercent}%</Typography>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </BunnyCard>
          </View>
        )}

        {/* CLIENT LIVE VIEW */}
        {partyMode === 'client' && (
          <View style={{ gap: 12 }}>
            <BunnyCard style={styles.card}>
              <View style={styles.headerRow}>
                <View>
                  <Typography variant="h3">Connected to Host</Typography>
                  <Muted>Status: Synchronized Party Client</Muted>
                </View>
                <Button variant="secondary" onPress={handleDisconnect}>
                  <Text style={{ color: colors.text }}>Disconnect</Text>
                </Button>
              </View>
            </BunnyCard>

            <BunnyCard style={styles.card}>
              <Typography variant="large" style={{ marginBottom: 12 }}>Synchronization Metrics</Typography>
              <View style={{ gap: 10 }}>
                <View style={styles.syncMetricRow}>
                  <Text style={{ color: colors.text }}>NTP Clock Offset</Text>
                  <Text style={[styles.syncMetricVal, { color: colors.primary }]}>
                    {clockOffset >= 0 ? `+${clockOffset.toFixed(1)} ms` : `${clockOffset.toFixed(1)} ms`}
                  </Text>
                </View>
                <View style={styles.syncMetricRow}>
                  <Text style={{ color: colors.text }}>Connection State</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Activity size={16} color="#22c55e" />
                    <Text style={{ color: '#22c55e', fontWeight: 'bold' }}>Active & Ready</Text>
                  </View>
                </View>
              </View>
            </BunnyCard>

            {/* Waiting/Listening indicator */}
            <View style={styles.clientWaveContainer}>
              <View style={[styles.clientPulseBg, { backgroundColor: addAlpha(colors.primary, 0.1) }]}>
                <Radio size={48} color={colors.primary} />
                <Typography variant="h3" style={{ marginTop: 16 }}>Listening to Party</Typography>
                <Muted style={{ textAlign: 'center', maxWidth: 220, marginTop: 4 }}>
                  Your playback is synced with the host. Music will play automatically.
                </Muted>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingTop: 110,
    gap: 16,
    paddingBottom: 40,
  },
  floatingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Popppins-Bold',
  },
  subtitle: {
    marginTop: -8,
    marginBottom: 8,
  },

  card: {
  },
  cardTitle: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  actionButton: {
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanningContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  radarCircle: {
    position: 'absolute',
    borderWidth: 1.5,
    width: 160,
    height: 160,
    borderRadius: 100,
  },
  hostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  canvasWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  gridCanvas: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderWidth: 1.5,
    borderRadius: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  sweetSpot: {
    position: 'absolute',
    left: GRID_SIZE / 2 - 20,
    top: GRID_SIZE / 2 - 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  clientNodeWrapper: {
    position: 'absolute',
    width: NODE_SIZE,
    alignItems: 'center',
  },
  clientNode: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  activeDragNode: {
    transform: [{ scale: 1.15 }],
    opacity: 0.9,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    width: 70,
    textAlign: 'center',
  },
  clientDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.8,
  },
  syncMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  syncMetricVal: {
    fontWeight: 'bold',
  },
  clientWaveContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  clientPulseBg: {
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
});
